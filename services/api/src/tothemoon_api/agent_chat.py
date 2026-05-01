from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types

from .circle import circle_client
from .config import Settings, get_settings
from .models import AgentChatRequest, AgentChatResponse, AgentToolEvent
from .observability import get_logger
from .payments import (
    create_demo_checkout,
    get_catalog,
    get_payment_intent_record,
    list_payment_intents,
    pay_payment_intent,
    unlock_and_deliver_payment_intent,
)

router = APIRouter(prefix="/api/agent", tags=["agent"])
log = get_logger(__name__)


def _as_content(role: str, text: str) -> types.Content:
    return types.Content(role=role, parts=[types.Part.from_text(text=text)])


class GeminiMarketplaceAgent:
    def __init__(self, settings: Settings):
        self.settings = settings
        if settings.gemini_api_key:
            self.client = genai.Client(api_key=settings.gemini_api_key)
        elif settings.gemini_use_vertexai:
            if not settings.gemini_vertex_project:
                raise HTTPException(
                    status_code=409,
                    detail="GEMINI_VERTEX_PROJECT is required when GEMINI_USE_VERTEXAI=true.",
                )
            self.client = genai.Client(
                vertexai=True,
                project=settings.gemini_vertex_project,
                location=settings.gemini_vertex_location,
            )
        else:
            raise HTTPException(
                status_code=409,
                detail="Configure GEMINI_API_KEY or GEMINI_USE_VERTEXAI=true for agent chat.",
            )

    def _demo_buyer_address(self) -> str:
        circle_client.ensure_wallets_loaded()
        buyer_address = circle_client.get_wallet_address(self.settings.demo_buyer_wallet_role)
        if buyer_address:
            return buyer_address
        return self.settings.demo_buyer_wallet_role

    def _system_instruction(self, authorized_artifact_id: str | None = None) -> str:
        mode = self.settings.settlement_auth_mode
        purchase_scope = (
            f"The UI selected artifact id is {authorized_artifact_id}. "
            "You may only create checkout, pay, and unlock that selected artifact. "
            if authorized_artifact_id
            else (
                "No artifact has been selected in the UI for purchase. "
                "Do not create checkout, pay, or unlock. Only list artifacts or explain the catalog. "
            )
        )
        return (
            "You are the buyer-side marketplace agent for TTM Agent Market. "
            "Keep answers concise and operational. "
            "The marketplace only sells paid artifacts settled in USDC on Arc testnet. "
            f"{purchase_scope}"
            f"The active settlement authorization mode is {mode}. "
            "When the user wants to buy something, first identify the artifact from the catalog, "
            "then create a checkout. "
            "If the mode is programmatic, continue by paying and unlocking the artifact. "
            "If the mode is manual, stop after checkout creation and explain that a human must fund the treasury route and provide the tx hash. "
            "Do not invent artifacts, prices, tx hashes, or payment states. "
            "If a tool returns an error, explain the blocker plainly."
        )

    def list_artifacts(self) -> dict[str, Any]:
        return {
            "artifacts": [artifact.model_dump(mode="json") for artifact in get_catalog()],
            "settlement_auth_mode": self.settings.settlement_auth_mode,
            "autonomous_payments_enabled": self.settings.autonomous_payments_enabled,
        }

    def list_orders(self) -> dict[str, Any]:
        return {
            "orders": [order.model_dump(mode="json") for order in list_payment_intents()[:8]],
            "settlement_auth_mode": self.settings.settlement_auth_mode,
        }

    def create_checkout(self, artifact_id: str) -> dict[str, Any]:
        checkout = create_demo_checkout(artifact_id, self._demo_buyer_address())
        return {
            "payment": checkout.model_dump(mode="json"),
            "buyer_address": checkout.buyer_address,
            "message": (
                f"Checkout created for {checkout.artifact_name} at {checkout.amount_usd:.3f} USDC."
            ),
        }

    def pay_artifact(self, payment_id: str) -> dict[str, Any]:
        payment = pay_payment_intent(payment_id)
        record = get_payment_intent_record(payment_id)
        return {
            "payment": record.model_dump(mode="json") if record else None,
            "result": payment.model_dump(mode="json"),
        }

    def unlock_artifact(self, payment_id: str) -> dict[str, Any]:
        record = unlock_and_deliver_payment_intent(payment_id)
        return {
            "payment": record.model_dump(mode="json"),
            "delivered": bool(record.download_url),
        }

    def _dispatch_tool(
        self,
        name: str,
        args: dict[str, Any],
        *,
        authorized_artifact_id: str | None = None,
        authorized_payment_ids: set[str] | None = None,
    ) -> dict[str, Any]:
        tools: dict[str, Callable[..., dict[str, Any]]] = {
            "list_artifacts": self.list_artifacts,
            "list_orders": self.list_orders,
            "create_checkout": self.create_checkout,
            "pay_artifact": self.pay_artifact,
            "unlock_artifact": self.unlock_artifact,
        }
        tool = tools.get(name)
        if not tool:
            return {"error": f"Unknown tool: {name}"}
        if name == "create_checkout":
            artifact_id = str(args.get("artifact_id") or "")
            if not authorized_artifact_id:
                return {
                    "error": "Purchase blocked. Select an artifact in the UI before checkout.",
                }
            if artifact_id != authorized_artifact_id:
                return {
                    "error": (
                        "Purchase blocked. The checkout artifact does not match the selected artifact."
                    )
                }
        if name in {"pay_artifact", "unlock_artifact"}:
            payment_id = str(args.get("payment_id") or "")
            if not authorized_artifact_id or payment_id not in (authorized_payment_ids or set()):
                return {
                    "error": (
                        "Payment blocked. Select an artifact in the UI and create its checkout first."
                    )
                }
        try:
            result = tool(**args)
            if name == "create_checkout" and authorized_payment_ids is not None:
                payment_id = result.get("payment", {}).get("payment_id")
                if payment_id:
                    authorized_payment_ids.add(str(payment_id))
            return result
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            return {"error": detail, "status_code": exc.status_code}
        except Exception as exc:  # pragma: no cover - defensive runtime guard
            log.warning("agent_tool_failed", tool=name, error=str(exc))
            return {"error": str(exc)}

    def respond(self, request: AgentChatRequest) -> AgentChatResponse:
        authorized_artifact_id = request.authorized_artifact_id
        authorized_payment_ids: set[str] = set()
        contents: list[types.Content] = [
            _as_content("user" if turn.role == "user" else "model", turn.text)
            for turn in request.history
        ]
        contents.append(_as_content("user", request.message))

        events: list[AgentToolEvent] = []
        config = types.GenerateContentConfig(
            system_instruction=self._system_instruction(authorized_artifact_id),
            tools=[
                self.list_artifacts,
                self.list_orders,
                self.create_checkout,
                self.pay_artifact,
                self.unlock_artifact,
            ],
            tool_config=types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(
                    mode=types.FunctionCallingConfigMode.AUTO
                )
            ),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            temperature=0.2,
        )

        for _ in range(6):
            response = self.client.models.generate_content(
                model=self.settings.gemini_model,
                contents=contents,
                config=config,
            )
            function_calls = response.function_calls or []
            if not function_calls:
                return AgentChatResponse(
                    reply=response.text or "Marketplace step completed.",
                    events=events,
                    orders=list_payment_intents(),
                    settlement_auth_mode=self.settings.settlement_auth_mode,
                    autonomous_payments_enabled=self.settings.autonomous_payments_enabled,
                )

            model_content = response.candidates[0].content if response.candidates else None
            if model_content:
                contents.append(model_content)

            function_response_parts: list[types.Part] = []
            for call in function_calls:
                name = call.name or "unknown_tool"
                args = dict(call.args or {})
                result = self._dispatch_tool(
                    name,
                    args,
                    authorized_artifact_id=authorized_artifact_id,
                    authorized_payment_ids=authorized_payment_ids,
                )
                events.append(
                    AgentToolEvent(
                        id=call.id or None,
                        name=name,
                        args=args,
                        response=result,
                    )
                )
                function_response_parts.append(
                    types.Part.from_function_response(name=name, response=result)
                )

            contents.append(types.Content(role="tool", parts=function_response_parts))

        raise HTTPException(status_code=502, detail="Agent exceeded the tool-call budget.")


@router.post("/chat", response_model=AgentChatResponse)
def chat_with_agent(request: AgentChatRequest):
    settings = get_settings()
    agent = GeminiMarketplaceAgent(settings)
    return agent.respond(request)

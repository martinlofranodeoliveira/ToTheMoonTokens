from mcp.server.fastmcp import FastMCP

mcp = FastMCP("arc-mcp")

@mcp.tool()
def get_arc_status() -> dict[str, str]:
    """Check the status of the Arc MCP server integration."""
    return {"status": "ok", "message": "Arc MCP server is integrated and responding"}

@mcp.tool()
def list_arc_jobs() -> list[dict[str, str]]:
    """List mock Arc jobs for hackathon demo."""
    return [
        {"job_id": "job-001", "status": "completed", "type": "research"},
    ]

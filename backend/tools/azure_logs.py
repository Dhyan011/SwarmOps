import os
from datetime import timedelta

try:
    from azure.identity import ClientSecretCredential
    from azure.monitor.query import LogsQueryClient
except ImportError:
    pass

async def query_azure_logs(kql_query: str, timespan_days: int = 1) -> str:
    """Executes a Kusto Query Language (KQL) query against Azure Log Analytics."""
    try:
        tenant_id = os.getenv("AZURE_TENANT_ID")
        client_id = os.getenv("AZURE_CLIENT_ID")
        client_secret = os.getenv("AZURE_CLIENT_SECRET")
        workspace_id = os.getenv("AZURE_LOG_ANALYTICS_WORKSPACE_ID")
        
        if not all([tenant_id, client_id, client_secret, workspace_id]):
            return "Azure Log Analytics Error: Missing credentials in environment variables."
            
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )
        client = LogsQueryClient(credential)
        
        response = client.query_workspace(
            workspace_id=workspace_id,
            query=kql_query,
            timespan=timedelta(days=timespan_days)
        )
        
        if response.status == "Failure":
            return f"Query Failed: {response.partial_error}"
            
        # Format the output table to a JSON-like string
        results = []
        for table in response.tables:
            for row in table.rows:
                row_dict = {col: str(val) for col, val in zip(table.columns, row)}
                results.append(row_dict)
                
        import json
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Azure Log Analytics Error: {str(e)}"

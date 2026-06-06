import json
import logging
from typing import List, Callable
import autogen
from models.alert import AlertModel
from models.finding import AgentFinding
from config.settings import settings
from websocket.ws_manager import ws_manager

logger = logging.getLogger(__name__)

class BaseAgent:
    def __init__(self, name: str, role: str, tools_list: List[Callable]):
        self.name = name
        self.role = role
        self.tools_list = tools_list
        
        from prompts.agent_prompts import AGENT_SYSTEM_PROMPT_TEMPLATE, AGENT_CONFIGS
        config = AGENT_CONFIGS.get(self.name)
        if not config:
            raise ValueError(f"No prompt config found for {self.name}")
        self.system_prompt = AGENT_SYSTEM_PROMPT_TEMPLATE.format(**config)
        
        self.llm_config = {
            "config_list": [{
                "model": settings.AGENT_MODEL,
                "api_key": settings.OPENROUTER_API_KEY,
                "base_url": "https://openrouter.ai/api/v1",
                "max_tokens": 800
            }],
            "temperature": 0.1
        }
        
        self.assistant = autogen.AssistantAgent(
            name=self.name,
            system_message=self.system_prompt,
            llm_config=self.llm_config,
        )
        
        self.user_proxy = autogen.UserProxyAgent(
            name=f"{self.name}_proxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=3,
            is_termination_msg=lambda x: "status" in (x.get("content", "") or "") and "agent" in (x.get("content", "") or ""),
            code_execution_config=False,
        )
        
        # Register tools
        for tool in self.tools_list:
            autogen.agentchat.register_function(
                tool,
                caller=self.assistant,
                executor=self.user_proxy,
                name=tool.__name__,
                description=tool.__doc__ or tool.__name__,
            )

    async def run(self, task: AlertModel) -> AgentFinding:
        await ws_manager.broadcast("agent_start", self.name, {"message": f"{self.name} started analysis"})
        prompt = f"Task (Alert): {task.model_dump_json()}"
        
        try:
            # We use a_initiate_chat for async support
            chat_result = await self.user_proxy.a_initiate_chat(
                self.assistant,
                message=prompt,
                summary_method="last_msg"
            )
            
            # The final response should be JSON.
            raw_text = chat_result.summary.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
                
            finding_dict = json.loads(raw_text.strip())
            finding = AgentFinding(**finding_dict)
            
            await ws_manager.broadcast("agent_complete", self.name, {"status": finding.status})
            return finding
            
        except Exception as e:
            logger.error(f"Error in {self.name}: {str(e)}")
            await ws_manager.broadcast("agent_error", self.name, {"error": str(e)})
            
            return AgentFinding(
                agent=self.name,
                status="error",
                anomaly_detected=None,
                anomaly_timestamp=None,
                affected_service=None,
                signal_type=None,
                signal_detail=None,
                evidence=[],
                confidence=None,
                recommended_action=None
            )

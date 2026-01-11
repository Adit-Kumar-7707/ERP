import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.rules.models import Rule, RuleAction, RuleEvent

logger = logging.getLogger(__name__)

class RuleValidator:
    def __init__(self, db: Session):
        self.db = db

    def validate(self, voucher_data: Dict[str, Any], event: RuleEvent, voucher_type_id: Optional[int] = None) -> List[Dict[str, str]]:
        """
        Validates voucher data against active rules.
        Returns a list of errors/warnings.
        """
        # Fetch applicable rules: Global (target_voucher_type_id IS NULL) OR specific to this voucher type
        rules = self.db.query(Rule).filter(
            Rule.event == event,
            (Rule.target_voucher_type_id == None) | (Rule.target_voucher_type_id == voucher_type_id)
        ).all()

        errors = []

        for rule in rules:
            try:
                # SAFE EVALUATION CONTEXT
                # We expose 'entry' as the voucher data dict
                context = {"entry": voucher_data, "amount": voucher_data.get("amount", 0)}
                
                # Evaluate condition
                # WARNING: eval() is used here for MVP flexibility. 
                # In production, use a safer expression engine like simpleeval or asteval.
                if eval(rule.condition, {"__builtins__": None}, context):
                    # Condition Met -> Rule Triggered
                    errors.append({
                        "rule_name": rule.name,
                        "action": rule.action,
                        "message": rule.message
                    })
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.name}: {e}")
                # decide if rule failure should block or ignore. defaulting to ignore for now.
        
        return errors

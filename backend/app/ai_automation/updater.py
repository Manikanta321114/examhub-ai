# Updater helper for comparison of existing exams vs suggestions
# Compares current fields and highlights what values changed.

class AIUpdater:
    @staticmethod
    def compare_exams(existing_exam_data: dict, suggestion_data: dict) -> dict:
        """
        Compares existing database record fields with newly extracted AI payload fields.
        Returns a dict highlighting modifications.
        """
        diffs = {}
        for key, new_val in suggestion_data.items():
            if key in ["id", "type", "exam_id", "status"]:
                continue
            old_val = existing_exam_data.get(key)
            if old_val != new_val:
                diffs[key] = {"old": old_val, "new": new_val}
        return diffs

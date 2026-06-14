# Cleaner helper for detecting expired or invalid exams
# Currently placeholder for checking deadlines and broken links.

class AICleaner:
    @staticmethod
    def is_exam_outdated(last_date_str: str, current_date_str: str) -> bool:
        """
        Compares registration deadline with current date to flag expired exams.
        """
        if not last_date_str:
            return False
        try:
            return last_date_str < current_date_str
        except Exception:
            return False

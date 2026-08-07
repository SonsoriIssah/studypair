"""Matching free-text course names.

DECISIONS.md: course names are free text and "exact matching logic is not yet
decided". The v1 rule is a case-insensitive comparison of the trimmed name, so
"calculus" and "Calculus " match but "Calc I" and "Calculus" do not.

It lives here because two endpoints have to agree on it: adding a course
fulfils applications, and creating an application refuses when a tutor already
teaches the course. If those drifted apart, a student could be blocked from
applying for a course that would never be fulfilled.
"""

from sqlalchemy import ColumnElement, func


def name_matches(column: ColumnElement[str], course_name: str) -> ColumnElement[bool]:
    """SQL predicate: `column` equals `course_name`, ignoring case and outer spaces."""
    return func.lower(func.trim(column)) == course_name.strip().lower()

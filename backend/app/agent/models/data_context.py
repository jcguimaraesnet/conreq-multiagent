"""
Data Context — structured data flowing through the workflow nodes.

Holds the project-level information extracted from the vision document
and existing requirements, enriched by downstream nodes with positive
impacts, uncertainties, and conjectural descriptions.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class FERC(BaseModel):
    """Writing Format for Conjectural Requirements."""
    desired_behavior: str = Field(description="The desired system behavior")
    positive_impact: str = Field(description="The need or positive impact of the desired attribute")
    uncertainties: List[str] = Field(description="Uncertainties associated with this requirement")


class QESS(BaseModel):
    """Solution Assumption Experimentation Framework."""
    solution_assumption: str = Field(description="Description of the solution assumption being tested")
    uncertainty_evaluated: str = Field(description="The single uncertainty that will be evaluated")
    observation_analysis: str = Field(description="Observation and analysis that will update the uncertainty")


class Evaluation(BaseModel):
    """Quality evaluation of a conjectural requirement (LLM or human)."""
    scores: Dict[str, int] = Field(
        default_factory=dict,
        description="Scores per quality criterion (1-5 Likert scale)",
    )
    justifications: Dict[str, str] = Field(
        default_factory=dict,
        description="Justifications per quality criterion (required for scores 1-4)",
    )
    overall_score: float = Field(
        default=0.0,
        description="Overall score — average of all quality criteria scores",
    )

    def compute_overall_score(self) -> float:
        """Compute and set the overall score as the mean of all criteria scores."""
        if self.scores:
            self.overall_score = round(sum(self.scores.values()) / len(self.scores), 2)
        return self.overall_score


class ConjecturalRequirement(BaseModel):
    """A conjectural software requirement specified using FERC and QESS."""
    attempt: int = Field(default=1, description="Attempt number for this conjectural requirement")
    ranking: Optional[int] = Field(
        default=None,
        description="Ranking position among attempts (1 = best overall score)",
    )
    ferc: FERC
    qess: QESS
    llm_evaluation: Optional[Evaluation] = Field(
        default=None,
        description="LLM-as-Judge evaluation",
    )
    human_evaluation: Optional[Evaluation] = Field(
        default=None,
        description="Human evaluation",
    )


class ConjecturalData(BaseModel):
    """Hierarchical data for a single conjectural requirement pipeline entry."""

    positive_impact: str = Field(
        default="",
        description="Positive business impact statement",
    )
    positive_impact_similarity: int = Field(
        default=0,
        description="Similarity percentage (0-100) between user brief description and refined impact (0 when auto-generated)",
    )
    uncertainty: str = Field(
        default="",
        description="Uncertainty detected for this positive impact",
    )
    supposition_solution: str = Field(
        default="",
        description="Solution assumption experiment for this impact+uncertainty pair",
    )
    conjectural_requirements: List[ConjecturalRequirement] = Field(
        default_factory=list,
        description="List of conjectural requirement attempts (FERC + QESS) — currently one, but supports multiple attempts",
    )


class DataContext(BaseModel):
    """Project context extracted during elicitation."""

    vision_raw: Optional[str] = Field(
        default=None,
        description="Raw text extracted from the vision document (before summarisation)",
    )
    project_summary: str = Field(
        default="",
        description="Concise project summary used as context for downstream analysis",
    )
    domain: str = Field(
        default="general software",
        description="Business or technical domain of the project",
    )
    stakeholder: str = Field(
        default="end user",
        description="Primary stakeholder role identified",
    )
    business_objective: str = Field(
        default="",
        description="Main business goal or value proposition the project aims to achieve",
    )
    conjectural_data: List[ConjecturalData] = Field(
        default_factory=list,
        description="Hierarchical data entries linking positive impacts, uncertainties, solution assumptions, and requirements with evaluations",
    )

    def rank_conjectural_requirements(self) -> None:
        """Rank conjectural requirements within each ConjecturalData by overall score (descending)."""
        for cd in self.conjectural_data:
            if len(cd.conjectural_requirements) <= 1:
                if cd.conjectural_requirements:
                    cd.conjectural_requirements[0].ranking = 1
                continue
            sorted_indices = sorted(
                range(len(cd.conjectural_requirements)),
                key=lambda idx: (
                    cd.conjectural_requirements[idx].llm_evaluation.overall_score
                    if cd.conjectural_requirements[idx].llm_evaluation else 0.0
                ),
                reverse=True,
            )
            for rank, idx in enumerate(sorted_indices, start=1):
                cd.conjectural_requirements[idx].ranking = rank

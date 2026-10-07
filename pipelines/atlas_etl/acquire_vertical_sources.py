"""Acquire the bounded candidate stack for Atlas expansion verticals.

This command is intentionally separate from the fixture build and the published
release lock. It downloads only versioned, public artifacts through provider
routes that do not require Atlas to accept terms or supply personal data on the
user's behalf. The resulting candidate lock records bytes and hashes, but does
not imply that an artifact is scientifically or legally ready for publication.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.request
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal


RETRIEVED_ON = "2026-09-23"
USER_AGENT = "Atlas-of-Humanity/0.1 source-audit (research software)"


ArtifactKind = Literal["json", "pdf", "rdata", "zip", "xlsx"]


@dataclass(frozen=True)
class CandidateArtifact:
    id: str
    source_id: str
    verticals: tuple[str, ...]
    url: str
    relative_path: str
    kind: ArtifactKind
    license: str
    publication_status: str


ARTIFACTS: tuple[CandidateArtifact, ...] = (
    CandidateArtifact(
        id="world_bank_gdp_per_capita_constant_2015_usd",
        source_id="world_bank_economics",
        verticals=("economics_over_time",),
        url=(
            "https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.KD"
            "?format=json&date=1960:2025&per_page=20000"
        ),
        relative_path="world_bank/2026-09-23/gdp-per-capita-constant-2015-usd.json",
        kind="json",
        license="CC-BY-4.0",
        publication_status="candidate_adapter_required",
    ),
    CandidateArtifact(
        id="world_bank_country_metadata_2026_09_23",
        source_id="world_bank_economics",
        verticals=("economics_over_time",),
        url="https://api.worldbank.org/v2/country?format=json&per_page=500",
        relative_path="world_bank/2026-09-23/countries.json",
        kind="json",
        license="CC-BY-4.0",
        publication_status="candidate_adapter_required",
    ),
    CandidateArtifact(
        id="clio_infra_total_population_compact",
        source_id="clio_infra",
        verticals=("population_over_time",),
        url="https://clio-infra.eu/data/TotalPopulation_Compact.xlsx",
        relative_path="clio-infra/TotalPopulation_Compact.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_gdp_per_capita_compact",
        source_id="clio_infra",
        verticals=("economics_over_time",),
        url="https://clio-infra.eu/data/GDPperCapita_Compact.xlsx",
        relative_path="clio_infra/2024-09-02/GDPperCapita_Compact.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_gdp_per_capita_broad",
        source_id="clio_infra",
        verticals=("economics_over_time",),
        url="https://clio-infra.eu/data/GDPperCapita_Broad.xlsx",
        relative_path="clio_infra/2024-09-02/GDPperCapita_Broad.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_internal_conflict_compact",
        source_id="clio_infra",
        verticals=("conflict_and_security",),
        url="https://clio-infra.eu/data/Armedconflicts%28Internal%29_Compact.xlsx",
        relative_path="clio_infra/2024-09-02/ArmedconflictsInternal_Compact.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_internal_conflict_broad",
        source_id="clio_infra",
        verticals=("conflict_and_security",),
        url="https://clio-infra.eu/data/Armedconflicts%28Internal%29_Broad.xlsx",
        relative_path="clio_infra/2024-09-02/ArmedconflictsInternal_Broad.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_international_conflict_compact",
        source_id="clio_infra",
        verticals=("conflict_and_security",),
        url="https://clio-infra.eu/data/ArmedConflicts%28International%29_Compact.xlsx",
        relative_path="clio_infra/2024-09-02/ArmedConflictsInternational_Compact.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_international_conflict_broad",
        source_id="clio_infra",
        verticals=("conflict_and_security",),
        url="https://clio-infra.eu/data/ArmedConflicts%28International%29_Broad.xlsx",
        relative_path="clio_infra/2024-09-02/ArmedConflictsInternational_Broad.xlsx",
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_executive_recruitment_competitiveness_compact",
        source_id="clio_infra",
        verticals=("institutions_and_governance",),
        url=(
            "https://clio-infra.eu/data/"
            "CompetitivenessofExecutiveRecruitment%28XRCOMP%29_Compact.xlsx"
        ),
        relative_path=(
            "clio_infra/2024-09-02/"
            "CompetitivenessofExecutiveRecruitmentXRCOMP_Compact.xlsx"
        ),
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="clio_infra_executive_recruitment_competitiveness_broad",
        source_id="clio_infra",
        verticals=("institutions_and_governance",),
        url=(
            "https://clio-infra.eu/data/"
            "CompetitivenessofExecutiveRecruitment%28XRCOMP%29_Broad.xlsx"
        ),
        relative_path=(
            "clio_infra/2024-09-02/"
            "CompetitivenessofExecutiveRecruitmentXRCOMP_Broad.xlsx"
        ),
        kind="xlsx",
        license="unverified_per_artifact_terms",
        publication_status="acquisition_for_review_only",
    ),
    CandidateArtifact(
        id="vdem_v16_country_year_rdata",
        source_id="vdem",
        verticals=("institutions_and_governance",),
        url="https://raw.githubusercontent.com/vdeminstitute/vdemdata/V16/data/vdem.RData",
        relative_path="vdem/v16/vdem.RData",
        kind="rdata",
        license="CC-BY-SA-4.0",
        publication_status="candidate_variable_review_required",
    ),
    CandidateArtifact(
        id="vdem_v16_codebook",
        source_id="vdem",
        verticals=("institutions_and_governance",),
        url="https://v-dem.net/documents/70/codebook_v16.pdf",
        relative_path="vdem/v16/codebook_v16.pdf",
        kind="pdf",
        license="CC-BY-SA-4.0",
        publication_status="candidate_variable_review_required",
    ),
    CandidateArtifact(
        id="vdem_v16_release_metadata",
        source_id="vdem",
        verticals=("institutions_and_governance",),
        url="https://api.github.com/repos/vdeminstitute/vdemdata/releases/tags/V16",
        relative_path="vdem/v16/github-release.json",
        kind="json",
        license="CC-BY-SA-4.0",
        publication_status="candidate_variable_review_required",
    ),
    CandidateArtifact(
        id="seshat_equinox_v1_archive",
        source_id="seshat",
        verticals=("population_over_time", "institutions_and_governance"),
        url=(
            "https://zenodo.org/api/records/6642230/files/"
            "seshatdb/Equinox_Data-v.1.zip/content"
        ),
        relative_path="seshat/equinox-v1/Equinox_Data-v.1.zip",
        kind="zip",
        license="CC-BY-4.0",
        publication_status="candidate_case_study_review_required",
    ),
    CandidateArtifact(
        id="seshat_equinox_v1_metadata",
        source_id="seshat",
        verticals=("population_over_time", "institutions_and_governance"),
        url="https://zenodo.org/api/records/6642230",
        relative_path="seshat/equinox-v1/zenodo-record.json",
        kind="json",
        license="CC-BY-4.0",
        publication_status="candidate_case_study_review_required",
    ),
    CandidateArtifact(
        id="ucdp_ged_26_1_csv_archive",
        source_id="ucdp",
        verticals=("conflict_and_security",),
        url="https://ucdp.uu.se/downloads/ged/ged261-csv.zip",
        relative_path="ucdp/26.1/ged261-csv.zip",
        kind="zip",
        license="CC-BY-4.0",
        publication_status="candidate_event_adapter_required",
    ),
    CandidateArtifact(
        id="ucdp_ged_26_1_codebook",
        source_id="ucdp",
        verticals=("conflict_and_security",),
        url="https://ucdp.uu.se/downloads/ged/ged261.pdf",
        relative_path="ucdp/26.1/ged261-codebook.pdf",
        kind="pdf",
        license="CC-BY-4.0",
        publication_status="candidate_event_adapter_required",
    ),
    CandidateArtifact(
        id="ucdp_prio_armed_conflict_26_1_csv_archive",
        source_id="ucdp",
        verticals=("conflict_and_security",),
        url="https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-261-csv.zip",
        relative_path="ucdp/26.1/ucdp-prio-acd-261-csv.zip",
        kind="zip",
        license="CC-BY-4.0",
        publication_status="candidate_conflict_year_adapter_required",
    ),
    CandidateArtifact(
        id="ucdp_prio_armed_conflict_26_1_codebook",
        source_id="ucdp",
        verticals=("conflict_and_security",),
        url="https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-261.pdf",
        relative_path="ucdp/26.1/ucdp-prio-acd-261-codebook.pdf",
        kind="pdf",
        license="CC-BY-4.0",
        publication_status="candidate_conflict_year_adapter_required",
    ),
)


BLOCKED_SOURCES = (
    {
        "source_id": "hyde",
        "verticals": ["population_over_time"],
        "status": "partial_sample_only_not_publishable",
        "reason": "Provider license conflict and missing masks/scenario series remain unresolved.",
    },
    {
        "source_id": "maddison",
        "verticals": ["economics_over_time"],
        "status": "official_workbook_access_blocked",
        "reason": "The official DataverseNL page and API return the Anubis protection page; no bypass attempted.",
    },
    {
        "source_id": "world_historical_gazetteer",
        "verticals": ["political_borders_and_names"],
        "status": "bulk_acquisition_requires_user_token_and_dataset_selection",
        "reason": "WHG requires credentials for most API/download routes and carries per-source licenses.",
    },
)


def validate_artifact(path: Path, kind: ArtifactKind) -> None:
    if path.stat().st_size == 0:
        raise RuntimeError(f"Downloaded artifact is empty: {path}")
    if kind == "json":
        json.loads(path.read_text(encoding="utf-8"))
        return
    if kind == "pdf":
        if not path.read_bytes()[:5] == b"%PDF-":
            raise RuntimeError(f"Expected PDF payload: {path}")
        return
    if kind in {"zip", "xlsx"}:
        if not zipfile.is_zipfile(path):
            raise RuntimeError(f"Expected ZIP container: {path}")
        if kind == "xlsx":
            with zipfile.ZipFile(path) as archive:
                if "[Content_Types].xml" not in archive.namelist():
                    raise RuntimeError(f"Expected XLSX workbook container: {path}")
        return
    if kind == "rdata" and path.stat().st_size < 1_000_000:
        raise RuntimeError(f"RData candidate is unexpectedly small: {path}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def acquire(artifact: CandidateArtifact, output_root: Path, refresh: bool) -> dict[str, object]:
    destination = output_root / artifact.relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if refresh or not destination.exists():
        partial = destination.with_suffix(f"{destination.suffix}.part")
        partial.unlink(missing_ok=True)
        request = urllib.request.Request(artifact.url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=180) as response, partial.open("wb") as target:
                if response.status != 200:
                    raise RuntimeError(f"Unexpected HTTP status {response.status} for {artifact.url}")
                while chunk := response.read(1024 * 1024):
                    target.write(chunk)
            os.replace(partial, destination)
        finally:
            partial.unlink(missing_ok=True)
    validate_artifact(destination, artifact.kind)
    return {
        **asdict(artifact),
        "verticals": list(artifact.verticals),
        "path": str(destination),
        "bytes": destination.stat().st_size,
        "sha256": sha256(destination),
    }


def validate_catalog() -> None:
    ids = [artifact.id for artifact in ARTIFACTS]
    paths = [artifact.relative_path for artifact in ARTIFACTS]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Candidate artifact IDs must be unique")
    if len(paths) != len(set(paths)):
        raise RuntimeError("Candidate artifact paths must be unique")
    if any(Path(path).is_absolute() or ".." in Path(path).parts for path in paths):
        raise RuntimeError("Candidate artifact paths must stay under the output root")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lockfile", type=Path, required=True)
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    validate_catalog()
    acquired = [acquire(artifact, args.output, args.refresh) for artifact in ARTIFACTS]
    payload = {
        "schema_version": "0.1.0",
        "status": "acquired_candidate_source_lock_not_publication_approval",
        "retrieved_on": RETRIEVED_ON,
        "artifacts": acquired,
        "blocked_sources": list(BLOCKED_SOURCES),
    }
    args.lockfile.parent.mkdir(parents=True, exist_ok=True)
    args.lockfile.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()

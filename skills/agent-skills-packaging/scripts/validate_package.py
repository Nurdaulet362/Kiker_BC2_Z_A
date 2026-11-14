#!/usr/bin/env python3
"""Supplemental Agent Skills package checks. Requires PyYAML; executes no skill code."""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

try:
    import yaml
except ImportError:
    raise SystemExit("PyYAML is required. Install it in an isolated Python environment.")

FIELDS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}


def validate(folder):
    root = Path(folder).resolve()
    errors = []
    try:
        text = (root / "SKILL.md").read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return [f"Cannot read SKILL.md: {exc}"]
    frontmatter = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|\Z)", text, re.S)
    if not frontmatter:
        return ["SKILL.md must start with YAML frontmatter"]
    try:
        meta = yaml.safe_load(frontmatter.group(1))
    except yaml.YAMLError as exc:
        return [f"Invalid YAML: {exc}"]
    if not isinstance(meta, dict):
        return ["Frontmatter must be a mapping"]
    extra = set(meta) - FIELDS
    if extra:
        errors.append(f"Unsupported frontmatter fields: {', '.join(map(str, extra))}")
    name = meta.get("name")
    if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or len(name) > 64:
        errors.append("Name must be 1–64 ASCII lower-case letters, digits and single hyphens")
    elif name != root.name:
        errors.append("Name must match the skill directory")
    description = meta.get("description")
    if not isinstance(description, str) or not description.strip() or len(description) > 1024:
        errors.append("Description must be a nonempty string of at most 1024 characters")
    for key in ["license", "compatibility", "allowed-tools"]:
        if key in meta and (not isinstance(meta[key], str) or not meta[key].strip()):
            errors.append(f"{key} must be a nonempty string")
    if isinstance(meta.get("compatibility"), str) and len(meta["compatibility"]) > 500:
        errors.append("compatibility must be at most 500 characters")
    if "metadata" in meta and (not isinstance(meta["metadata"], dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in meta["metadata"].items())):
        errors.append("metadata must map strings to strings")
    if not text[frontmatter.end():].strip():
        errors.append("Skill instructions are empty")
    for document in root.rglob("*.md"):
        if not document.resolve().is_relative_to(root):
            errors.append(f"Markdown file escapes package: {document.name}")
            continue
        try:
            markdown = document.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"Cannot read {document.name}: {exc}")
            continue
        for target in re.findall(r"\[[^\]\n]*\]\(([^)\n]+)\)", markdown):
            target = target.strip().strip("<>")
            if target.startswith("#") or urlsplit(target).scheme:
                continue
            destination = (document.parent / unquote(target.split("#", 1)[0])).resolve()
            if not destination.is_relative_to(root):
                errors.append(f"Local reference escapes package in {document.name}: {target}")
            elif not destination.is_file():
                errors.append(f"Missing local reference in {document.name}: {target}")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skills", nargs="+")
    args = parser.parse_args()
    results = [{"path": str(Path(folder).resolve()), "errors": validate(folder)} for folder in args.skills]
    print(json.dumps(results, ensure_ascii=False, indent=2))
    raise SystemExit(1 if any(result["errors"] for result in results) else 0)

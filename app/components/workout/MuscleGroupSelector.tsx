"use client";

import { useState } from "react";
import type { MuscleGroup, MuscleGroupId } from "../../types/workout";

interface MuscleGroupSelectorProps {
  selectedGroup: MuscleGroupId;
  onSelect: (groupId: MuscleGroupId) => void;
}

const primaryGroups: ReadonlyArray<
  Pick<MuscleGroup, "id" | "name"> & { icon: string; description: string }
> = [
  { id: "chest", name: "胸", icon: "▰", description: "推举与夹胸" },
  { id: "back", name: "背", icon: "↕", description: "下拉与划船" },
  { id: "shoulders", name: "肩", icon: "◇", description: "推举与平举" },
];

const armGroups: ReadonlyArray<
  Pick<MuscleGroup, "id" | "name" | "parentGroup">
> = [
  { id: "biceps", name: "二头肌" },
  { id: "triceps", name: "三头肌", parentGroup: "arms" },
];

export function MuscleGroupSelector({
  selectedGroup,
  onSelect,
}: MuscleGroupSelectorProps) {
  const armSelected = selectedGroup === "biceps" || selectedGroup === "triceps";
  const [armsExpanded, setArmsExpanded] = useState(armSelected);
  const showArmGroups = armSelected || armsExpanded;

  return (
    <section
      className="workout-muscle-selector"
      aria-labelledby="muscle-group-heading"
    >
      <div className="workout-section-heading">
        <div>
          <p className="workout-eyebrow">选择训练部位</p>
          <h2 id="muscle-group-heading">今天练哪里？</h2>
        </div>
      </div>

      <div className="muscle-group-grid" role="list">
        {primaryGroups.map((group) => (
          <button
            className="muscle-group-card"
            data-active={selectedGroup === group.id}
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            aria-pressed={selectedGroup === group.id}
          >
            <span className="muscle-group-icon" aria-hidden="true">
              {group.icon}
            </span>
            <span className="muscle-group-copy">
              <strong>{group.name}</strong>
              <small>{group.description}</small>
            </span>
          </button>
        ))}

        <button
          className="muscle-group-card muscle-group-card-arms"
          data-active={armSelected}
          data-expanded={showArmGroups}
          type="button"
          onClick={() => setArmsExpanded((expanded) => !expanded)}
          aria-expanded={showArmGroups}
          aria-controls="arm-muscle-groups"
        >
          <span className="muscle-group-icon" aria-hidden="true">⌑</span>
          <span className="muscle-group-copy">
            <strong>手臂</strong>
            <small>二头肌与三头肌</small>
          </span>
          <span className="muscle-group-chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>

      {showArmGroups && (
        <div className="arm-subgroup-selector" id="arm-muscle-groups">
          {armGroups.map((group) => (
            <button
              className="arm-subgroup-button"
              data-active={selectedGroup === group.id}
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              aria-pressed={selectedGroup === group.id}
            >
              <span aria-hidden="true">●</span>
              {group.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

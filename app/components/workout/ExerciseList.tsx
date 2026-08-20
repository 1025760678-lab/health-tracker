"use client";

import { FormEvent, useState } from "react";
import type { Exercise } from "../../types/workout";

interface ExerciseListProps {
  exercises: Exercise[];
  selectedExerciseId: string | null;
  onSelect: (exerciseId: string) => void;
  onAdd: (name: string) => void;
  onRename: (exerciseId: string, name: string) => void;
  onDelete: (exerciseId: string) => void;
}

export function ExerciseList({
  exercises,
  selectedExerciseId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: ExerciseListProps) {
  const [newExerciseName, setNewExerciseName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newExerciseName.trim();
    if (!name) return;

    onAdd(name);
    setNewExerciseName("");
  }

  function beginRename(exercise: Exercise) {
    setEditingId(exercise.id);
    setEditingName(exercise.name);
  }

  function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    const name = editingName.trim();
    if (!name) return;

    onRename(editingId, name);
    setEditingId(null);
    setEditingName("");
  }

  return (
    <section className="exercise-library" aria-labelledby="exercise-list-heading">
      <div className="workout-section-heading exercise-library-heading">
        <div>
          <p className="workout-eyebrow">动作库</p>
          <h2 id="exercise-list-heading">选择动作</h2>
        </div>
        <span className="exercise-count" aria-label={`${exercises.length} 个动作`}>
          {exercises.length}
        </span>
      </div>

      <div className="exercise-list">
        {exercises.length === 0 && (
          <p className="exercise-empty-state">还没有动作，在下方添加第一个吧。</p>
        )}

        {exercises.map((exercise) => {
          const selected = selectedExerciseId === exercise.id;
          const editing = editingId === exercise.id;

          return (
            <article
              className="exercise-list-item"
              data-active={selected}
              key={exercise.id}
            >
              {editing ? (
                <form className="exercise-rename-form" onSubmit={handleRename}>
                  <label className="sr-only" htmlFor={`rename-exercise-${exercise.id}`}>
                    修改 {exercise.name} 的名称
                  </label>
                  <input
                    id={`rename-exercise-${exercise.id}`}
                    className="workout-inline-input"
                    type="text"
                    maxLength={60}
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <button
                    className="exercise-inline-action exercise-inline-action-save"
                    type="submit"
                    disabled={!editingName.trim()}
                  >
                    保存
                  </button>
                  <button
                    className="exercise-inline-action"
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName("");
                    }}
                  >
                    取消
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className="exercise-select-button"
                    type="button"
                    onClick={() => onSelect(exercise.id)}
                    aria-pressed={selected}
                  >
                    <span className="exercise-status-dot" aria-hidden="true" />
                    <span>{exercise.name}</span>
                    <span className="exercise-select-chevron" aria-hidden="true">
                      ›
                    </span>
                  </button>

                  {selected && (
                    <div className="exercise-item-actions">
                      <button type="button" onClick={() => beginRename(exercise)}>
                        重命名
                      </button>
                      <button
                        className="exercise-delete-button"
                        type="button"
                        onClick={() => onDelete(exercise.id)}
                        aria-label={`删除动作 ${exercise.name}`}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>

      <form className="exercise-add-form" onSubmit={handleAdd}>
        <label htmlFor="new-exercise-name">新增自定义动作</label>
        <div className="exercise-add-row">
          <input
            id="new-exercise-name"
            className="workout-inline-input"
            type="text"
            maxLength={60}
            placeholder="例如：器械推胸"
            value={newExerciseName}
            onChange={(event) => setNewExerciseName(event.target.value)}
          />
          <button
            className="exercise-add-button"
            type="submit"
            disabled={!newExerciseName.trim()}
          >
            <span aria-hidden="true">＋</span>
            添加
          </button>
        </div>
      </form>
    </section>
  );
}

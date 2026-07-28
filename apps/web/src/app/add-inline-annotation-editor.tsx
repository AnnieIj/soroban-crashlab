'use client';

import React, { useState } from 'react';
import type { FuzzingRun } from './types';

interface InlineAnnotationEditorProps {
  /** The run to edit annotations for */
  run: FuzzingRun;
  /** Called when annotations are updated */
  onSave: (runId: string, annotations: string[]) => Promise<void>;
  /** Optional callback when edit mode is toggled */
  onEditModeChange?: (isEditing: boolean) => void;
}

export default function InlineAnnotationEditor({
  run,
  onSave,
  onEditModeChange,
}: InlineAnnotationEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnnotations, setEditedAnnotations] = useState<string[]>(
    run.annotations || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit mode
      setEditedAnnotations(run.annotations || []);
      setErrorMessage(null);
    }
    const newEditingState = !isEditing;
    setIsEditing(newEditingState);
    onEditModeChange?.(newEditingState);
  };

  const handleAnnotationChange = (index: number, value: string) => {
    const updated = [...editedAnnotations];
    updated[index] = value;
    setEditedAnnotations(updated);
    setErrorMessage(null);
  };

  const handleAddAnnotation = () => {
    setEditedAnnotations([...editedAnnotations, '']);
    setErrorMessage(null);
  };

  const handleRemoveAnnotation = (index: number) => {
    const updated = editedAnnotations.filter((_, i) => i !== index);
    setEditedAnnotations(updated);
    setErrorMessage(null);
  };

  const validateAnnotations = (): boolean => {
    for (const annotation of editedAnnotations) {
      if (annotation.length === 0) {
        setErrorMessage('Annotations cannot be empty');
        return false;
      }
      if (annotation.length > 500) {
        setErrorMessage('Each annotation must be 500 characters or less');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateAnnotations()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(run.id, editedAnnotations);
      setIsEditing(false);
      setErrorMessage(null);
      onEditModeChange?.(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save annotations'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    // Display mode
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors group"
        onDoubleClick={handleEditToggle}
      >
        <svg
          className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {editedAnnotations.length > 0 ? (
            <>
              {editedAnnotations.length} annotation{editedAnnotations.length !== 1 ? 's' : ''}
            </>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500 italic">
              Double-click to add annotations
            </span>
          )}
        </span>
        <button
          onClick={handleEditToggle}
          className="ml-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Edit
        </button>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-3 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
          Edit Annotations
        </h4>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Run ID: <code className="font-mono">{run.id}</code>
        </span>
      </div>

      {errorMessage && (
        <div className="p-2 rounded bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {editedAnnotations.map((annotation, index) => (
          <div key={index} className="flex gap-2 items-start">
            <input
              type="text"
              value={annotation}
              onChange={(e) => handleAnnotationChange(index, e.target.value)}
              maxLength={500}
              placeholder={`Annotation ${index + 1}`}
              className="flex-1 px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            <button
              onClick={() => handleRemoveAnnotation(index)}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={handleAddAnnotation}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-2 rounded border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          + Add Annotation
        </button>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-indigo-200 dark:border-indigo-800">
        <button
          onClick={handleEditToggle}
          disabled={isSaving}
          className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 px-4 py-2 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs font-semibold text-white px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}

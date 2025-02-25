export interface Step {
  id: number;
  label: string;
  desc: string;
}

export interface GroupData {
  groupId: string;
  groupLabel: string;
  mapDescription: string;
  steps: Step[];
}

export interface FlattenedStep extends Step {
  groupId: string;
  globalIndex: number;
  stepIdInGroup: number;
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  groups: GroupData[];
}

export type StepContainerMap = Record<string, HTMLDivElement | null>;
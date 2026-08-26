import type { ComponentType } from "react";
import type { TemplatePick } from "../../../../shared/api";
import {
  IconPage,
  IconTemplateBlank,
  IconTemplateDecision,
  IconTemplateMeeting,
  IconTemplateNotes,
  IconTemplateProject,
  IconTemplateTasks,
} from "../../../components/icons";

type IconProps = { size?: number };

const BY_ID: Record<string, ComponentType<IconProps>> = {
  blank: IconTemplateBlank,
  meeting: IconTemplateMeeting,
  tasks: IconTemplateTasks,
  project: IconTemplateProject,
  prd: IconTemplateProject,
  notes: IconTemplateNotes,
  spec: IconTemplateNotes,
  decision: IconTemplateDecision,
};

export function templateIcon(pick: Pick<TemplatePick, "id">): ComponentType<IconProps> {
  return BY_ID[pick.id] ?? IconPage;
}

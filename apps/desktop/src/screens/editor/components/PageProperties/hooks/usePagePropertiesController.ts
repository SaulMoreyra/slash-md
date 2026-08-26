import { useCallback } from "react";
import { formatList, parseList, parsePeople } from "@slash-md/core/frontmatter";
import type { FrontmatterFields } from "../../../../../../shared/api";
import { tokensFromPeopleInput, tokensFromTagsInput } from "../utils";

type Params = {
  fields: FrontmatterFields;
  canWrite: boolean;
  onFrontmatterPatch: (patch: Partial<FrontmatterFields>) => Promise<void>;
};

export function usePagePropertiesController({ fields, canWrite, onFrontmatterPatch }: Params) {
  const people = parsePeople(fields.people);
  const tags = parseList(fields.tags);
  const showPeople = people.length > 0 || canWrite;
  const showTags = tags.length > 0 || canWrite;

  const onAddPeople = useCallback(
    async (raw: string) => {
      const parsed = tokensFromPeopleInput(raw);
      if (!parsed.length || !canWrite) return false;
      await onFrontmatterPatch({ people: formatList([...people, ...parsed]) });
      return true;
    },
    [people, canWrite, onFrontmatterPatch],
  );

  const onRemovePeople = useCallback(
    async (logins: string[]) => {
      if (!canWrite || logins.length === 0) return;
      const drop = new Set(logins.map((login) => login.toLowerCase()));
      await onFrontmatterPatch({
        people: formatList(people.filter((login) => !drop.has(login.toLowerCase()))),
      });
    },
    [people, canWrite, onFrontmatterPatch],
  );

  const onAddTags = useCallback(
    async (raw: string) => {
      const parsed = tokensFromTagsInput(raw);
      if (!parsed.length || !canWrite) return false;
      await onFrontmatterPatch({ tags: formatList([...tags, ...parsed]) });
      return true;
    },
    [tags, canWrite, onFrontmatterPatch],
  );

  const onRemoveTags = useCallback(
    async (values: string[]) => {
      if (!canWrite || values.length === 0) return;
      const drop = new Set(values.map((tag) => tag.toLowerCase()));
      await onFrontmatterPatch({
        tags: formatList(tags.filter((tag) => !drop.has(tag.toLowerCase()))),
      });
    },
    [tags, canWrite, onFrontmatterPatch],
  );

  return {
    people,
    tags,
    showPeople,
    showTags,
    visible: showPeople || showTags,
    onAddPeople,
    onRemovePeople,
    onAddTags,
    onRemoveTags,
  };
}

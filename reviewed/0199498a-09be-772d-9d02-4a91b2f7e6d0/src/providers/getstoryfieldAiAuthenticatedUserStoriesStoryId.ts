import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Get detail information for a specific story by its ID (storyfield_ai_stories
 * table).
 *
 * Retrieves the detail for a single AI-generated story, enforcing ownership and
 * soft-delete constraints. Soft-deleted stories are inaccessible to
 * authenticated users. Only the story owner may view the record.
 *
 * @param props - Object containing the authenticated user and target storyId
 * @param props.authenticatedUser - The authenticated user payload
 * @param props.storyId - UUID for the story to retrieve
 * @returns IStoryfieldAiStory with all audit, language, and core metadata
 *   fields
 * @throws {Error} If the story does not exist, is soft-deleted, or is not owned
 *   by the user
 */
export async function getstoryfieldAiAuthenticatedUserStoriesStoryId(props: {
  authenticatedUser: AuthenticateduserPayload;
  storyId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiStory> {
  const { authenticatedUser, storyId } = props;

  const record = await MyGlobal.prisma.storyfield_ai_stories.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      storyfield_ai_authenticateduser_id: true,
      title: true,
      main_plot: true,
      language: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!record) throw new Error("Story not found");
  if (record.deleted_at !== null)
    throw new Error("Story is deleted and not accessible");
  if (record.storyfield_ai_authenticateduser_id !== authenticatedUser.id)
    throw new Error("Unauthorized: You do not own this story");

  return {
    id: record.id,
    storyfield_ai_authenticateduser_id:
      record.storyfield_ai_authenticateduser_id,
    title: record.title,
    main_plot: record.main_plot ?? null,
    language: record.language,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}

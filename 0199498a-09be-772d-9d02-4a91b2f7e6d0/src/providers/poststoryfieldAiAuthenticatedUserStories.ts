import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import { AuthenticateduserPayload } from "../decorators/payload/AuthenticateduserPayload";

/**
 * Create a new story record associated with an authenticated user
 * (storyfield_ai_stories table).
 *
 * This operation creates a new AI-generated story record for the authenticated
 * user in the storyfield_ai_stories table. It records required metadata (title,
 * main plot, language, and creator reference), initializing all audit and
 * compliance fields. Ownership is established via foreign key, and the record
 * supports soft deletion via deleted_at. Duplicate titles for the same user are
 * not allowed.
 *
 * @param props - Object containing request parameters
 * @param props.authenticatedUser - AuthenticateduserPayload; must reference a
 *   valid active user
 * @param props.body - Story creation input (title, main_plot, language)
 * @returns IStoryfieldAiStory - The newly created story resource
 * @throws {Error} If the authenticated user is invalid or missing
 * @throws {Error} If there is a duplicate story title for the same user
 *   (non-deleted)
 */
export async function poststoryfieldAiAuthenticatedUserStories(props: {
  authenticatedUser: AuthenticateduserPayload;
  body: IStoryfieldAiStory.ICreate;
}): Promise<IStoryfieldAiStory> {
  const { authenticatedUser, body } = props;

  // 1. Ensure the user is active and not soft deleted
  const user = await MyGlobal.prisma.storyfield_ai_authenticatedusers.findFirst(
    {
      where: {
        id: authenticatedUser.id,
        deleted_at: null,
      },
    },
  );
  if (!user) {
    throw new Error("Authenticated user not found");
  }

  // 2. Check for duplicate active story title for this user
  const existing = await MyGlobal.prisma.storyfield_ai_stories.findFirst({
    where: {
      storyfield_ai_authenticateduser_id: authenticatedUser.id,
      title: body.title,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error("Story title already exists for this user");
  }

  // 3. Prepare audit/compliance fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // 4. Create the story record
  const newStory = await MyGlobal.prisma.storyfield_ai_stories.create({
    data: {
      id,
      storyfield_ai_authenticateduser_id: authenticatedUser.id,
      title: body.title,
      main_plot: body.main_plot ?? undefined,
      language: body.language,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Return object matched to IStoryfieldAiStory (handling optional/nullable fields correctly)
  return {
    id: newStory.id,
    storyfield_ai_authenticateduser_id:
      newStory.storyfield_ai_authenticateduser_id,
    title: newStory.title,
    main_plot: newStory.main_plot ?? undefined,
    language: newStory.language,
    created_at: newStory.created_at,
    updated_at: newStory.updated_at,
    deleted_at: newStory.deleted_at ?? undefined,
  };
}

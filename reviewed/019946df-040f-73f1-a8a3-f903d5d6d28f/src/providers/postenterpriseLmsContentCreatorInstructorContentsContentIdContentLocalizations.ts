import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new content localization record for a specific content item.
 *
 * This operation allows authorized content creator instructors to add a new
 * localized version (translation) of the content title and description for a
 * given content item identified by `contentId`.
 *
 * Authorization: The content creator instructor must have access to the
 * content.
 *
 * @param props - Operation parameters
 * @param props.contentCreatorInstructor - Authenticated content creator
 *   instructor
 * @param props.contentId - UUID of the target content item
 * @param props.body - Localization data including language code, title, and
 *   description
 * @returns The newly created content localization record
 * @throws {Error} When the content does not exist or unauthorized
 */
export async function postenterpriseLmsContentCreatorInstructorContentsContentIdContentLocalizations(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  contentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentLocalization.ICreate;
}): Promise<IEnterpriseLmsContentLocalization> {
  const { contentCreatorInstructor, contentId, body } = props;

  const content = await MyGlobal.prisma.enterprise_lms_contents.findFirst({
    where: {
      id: contentId,
    },
  });

  if (!content) {
    throw new Error("Unauthorized or content not found.");
  }

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.enterprise_lms_content_localizations.create({
      data: {
        id: newId,
        content_id: contentId,
        language_code: body.language_code,
        localized_title: body.localized_title ?? undefined,
        localized_description: body.localized_description ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    content_id: created.content_id,
    language_code: created.language_code,
    localized_title: created.localized_title ?? null,
    localized_description: created.localized_description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}

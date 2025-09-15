import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsContentLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentLocalization";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

export async function putenterpriseLmsContentCreatorInstructorContentsContentIdContentLocalizationsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsContentLocalization.IUpdate;
}): Promise<IEnterpriseLmsContentLocalization> {
  const { contentCreatorInstructor, contentId, id, body } = props;

  // Fetch user to get tenant_id for authorization
  const user =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUnique({
      where: { id: contentCreatorInstructor.id },
    });

  if (!user) {
    throw new Error("Unauthorized: Content creator instructor user not found");
  }

  // Verify content exists and belongs to user's tenant
  const content = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id: contentId },
  });

  if (!content) {
    throw new Error("Content not found");
  }

  if (content.tenant_id !== user.tenant_id) {
    throw new Error("Unauthorized to update content localization");
  }

  // Verify localization exists linked to content
  const localization =
    await MyGlobal.prisma.enterprise_lms_content_localizations.findFirst({
      where: {
        id,
        content_id: contentId,
      },
    });

  if (!localization) {
    throw new Error("Content localization not found");
  }

  // Update localization
  const updated =
    await MyGlobal.prisma.enterprise_lms_content_localizations.update({
      where: { id },
      data: {
        localized_title: body.localized_title ?? undefined,
        localized_description: body.localized_description ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated localization with date conversions
  return {
    id: updated.id,
    content_id: updated.content_id,
    language_code: updated.language_code,
    localized_title: updated.localized_title ?? null,
    localized_description: updated.localized_description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a content localization for the given content.
 *
 * @param props - Props containing systemAdmin, contentId and localization id
 * @throws Error if content or localization does not exist
 */
export async function deleteenterpriseLmsSystemAdminContentsContentIdContentLocalizationsId(props: {
  systemAdmin: SystemadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, contentId, id } = props;

  const content = await MyGlobal.prisma.enterprise_lms_contents.findUnique({
    where: { id: contentId },
  });

  if (!content) throw new Error("Content or localization not found");

  const localization =
    await MyGlobal.prisma.enterprise_lms_content_localizations.findFirst({
      where: { id, content_id: contentId },
    });

  if (!localization) throw new Error("Content or localization not found");

  await MyGlobal.prisma.enterprise_lms_content_localizations.delete({
    where: { id },
  });
}

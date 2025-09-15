import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

export async function deleteenterpriseLmsContentCreatorInstructorContentsContentIdContentLocalizationsId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentCreatorInstructor, contentId, id } = props;

  // Fetch the user to verify tenant and status
  const user =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUnique({
      where: { id: contentCreatorInstructor.id },
      select: { tenant_id: true, status: true },
    });

  if (!user || user.status !== "active") {
    throw new Error(
      "Unauthorized: Content creator instructor not found or inactive",
    );
  }

  // Fetch the localization with related content to verify ownership and tenant
  const localization =
    await MyGlobal.prisma.enterprise_lms_content_localizations.findFirst({
      where: { id, content_id: contentId },
      include: { content: { select: { tenant_id: true } } },
    });

  if (!localization) {
    throw new Error("Content localization not found");
  }

  if (localization.content.tenant_id !== user.tenant_id) {
    throw new Error("Unauthorized access: tenant mismatch");
  }

  // Perform hard delete as per API contract
  await MyGlobal.prisma.enterprise_lms_content_localizations.delete({
    where: { id },
  });
}

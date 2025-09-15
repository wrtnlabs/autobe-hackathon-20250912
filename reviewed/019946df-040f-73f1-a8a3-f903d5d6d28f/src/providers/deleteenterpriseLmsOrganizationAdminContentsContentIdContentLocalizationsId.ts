import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes a specific content localization associated with a content item.
 *
 * This operation permanently removes the localization record. It requires that
 * the requesting organization administrator belongs to the same tenant as the
 * content.
 *
 * @param props - The function parameters
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.contentId - UUID of the content item
 * @param props.id - UUID of the content localization to delete
 * @throws {Error} When content or localization is not found
 * @throws {Error} When user is unauthorized due to tenant mismatch
 */
export async function deleteenterpriseLmsOrganizationAdminContentsContentIdContentLocalizationsId(props: {
  organizationAdmin: OrganizationadminPayload;
  contentId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, contentId, id } = props;

  // Fetch organizationAdmin from DB to get tenant_id
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
      select: { tenant_id: true },
    });

  // Fetch content to ensure existence and get tenant_id
  const content =
    await MyGlobal.prisma.enterprise_lms_contents.findUniqueOrThrow({
      where: { id: contentId },
      select: { tenant_id: true },
    });

  // Authorization check: tenant must match
  if (admin.tenant_id !== content.tenant_id) {
    throw new Error("Unauthorized: Tenant mismatch");
  }

  // Verify the content localization exists
  await MyGlobal.prisma.enterprise_lms_content_localizations.findFirstOrThrow({
    where: { id, content_id: contentId },
  });

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_content_localizations.delete({
    where: { id },
  });
}

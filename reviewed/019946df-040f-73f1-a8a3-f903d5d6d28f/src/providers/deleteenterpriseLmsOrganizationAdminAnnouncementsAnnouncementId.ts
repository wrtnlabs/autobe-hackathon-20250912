import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes an existing announcement identified by its announcementId from the
 * enterprise LMS system.
 *
 * This operation targets the enterprise_lms_announcements table ensuring that
 * the announcement is permanently removed from the database. Any associated
 * data such as delivery receipts or related metadata is also deleted. Soft
 * deletion fields exist but this endpoint performs a full removal.
 *
 * Appropriate authentication and authorization are required to perform this
 * operation, generally limited to organization administrators.
 *
 * @param props - Object containing the organizationAdmin payload and the
 *   announcementId to delete
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the operation
 * @param props.announcementId - UUID of the announcement to delete
 * @throws {Error} If the announcement does not exist
 */
export async function deleteenterpriseLmsOrganizationAdminAnnouncementsAnnouncementId(props: {
  organizationAdmin: OrganizationadminPayload;
  announcementId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, announcementId } = props;

  // Verify existence of announcement
  await MyGlobal.prisma.enterprise_lms_announcements.findUniqueOrThrow({
    where: { id: announcementId },
  });

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_announcements.delete({
    where: { id: announcementId },
  });
}

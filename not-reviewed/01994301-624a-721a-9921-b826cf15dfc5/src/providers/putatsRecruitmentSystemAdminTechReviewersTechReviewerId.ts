import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update existing technical reviewer account in ats_recruitment_techreviewers
 * by ID.
 *
 * This operation updates the fields and profile information for an existing
 * technical reviewer account. System administrators can modify name, email,
 * specialization, and is_active status. Email uniqueness and data validation
 * are enforced. Date fields are formatted as ISO 8601 strings. Deleted accounts
 * cannot be updated. Returns the updated reviewer entity.
 *
 * @param props - Properties for system admin update operation
 * @param props.systemAdmin - Authenticated system administrator user
 * @param props.techReviewerId - Unique ID of the tech reviewer to update
 * @param props.body - Update payload (optional/relevant fields)
 * @returns The updated IAtsRecruitmentTechReviewer entity
 * @throws {Error} If reviewer not found or email conflict/validation
 */
export async function putatsRecruitmentSystemAdminTechReviewersTechReviewerId(props: {
  systemAdmin: SystemadminPayload;
  techReviewerId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentTechReviewer.IUpdate;
}): Promise<IAtsRecruitmentTechReviewer> {
  const { systemAdmin, techReviewerId, body } = props;

  // Look up reviewer to ensure exists and not deleted
  const reviewer =
    await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
      where: {
        id: techReviewerId,
        deleted_at: null,
      },
    });
  if (!reviewer) throw new Error("Technical reviewer not found");

  // Enforce unique email if being updated
  if (body.email !== undefined) {
    const existing =
      await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
        where: {
          email: body.email,
          id: { not: techReviewerId },
          deleted_at: null,
        },
      });
    if (existing)
      throw new Error("Email already in use by another technical reviewer");
  }

  // Prepare update data (only provided fields)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData: Record<string, unknown> = {
    updated_at: now,
  };
  if (body.email !== undefined) updateData.email = body.email;
  if (body.name !== undefined) updateData.name = body.name;
  if (body.specialization !== undefined)
    updateData.specialization = body.specialization;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  // Update and select allowed fields only
  const updated = await MyGlobal.prisma.ats_recruitment_techreviewers.update({
    where: { id: techReviewerId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      specialization: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    specialization: updated.specialization,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates an existing enrollment record in the Enterprise LMS system.
 *
 * This operation modifies fields such as status and business status, enforcing
 * tenant isolation so that only enrollments belonging to the authenticated
 * organization admin's tenant can be updated.
 *
 * @param props - Object containing the authenticated organization admin,
 *   enrollment ID, and update payload conforming to
 *   IEnterpriseLmsEnrollment.IUpdate
 * @returns The updated enrollment record reflecting the changes made.
 * @throws {Error} When the enrollment is not found or does not belong to the
 *   tenant
 */
export async function putenterpriseLmsOrganizationAdminEnrollmentsId(props: {
  organizationAdmin: OrganizationadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollment.IUpdate;
}): Promise<IEnterpriseLmsEnrollment> {
  const { organizationAdmin, id, body } = props;

  // Fetch enrollment with learner to check tenant
  const enrollment =
    await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
      where: { id },
      include: { learner: true },
    });
  if (!enrollment) throw new Error("Enrollment not found");

  // Check tenant
  if (enrollment.learner.tenant_id !== organizationAdmin.tenant_id) {
    throw new Error("Unauthorized: Enrollment does not belong to your tenant");
  }

  // Prepare update data, excluding deleted_at
  const updateData: IEnterpriseLmsEnrollment.IUpdate = {
    learner_id: body.learner_id ?? undefined,
    learning_path_id: body.learning_path_id ?? undefined,
    status: body.status ?? undefined,
    business_status: body.business_status ?? undefined,
    created_at:
      body.created_at !== undefined
        ? toISOStringSafe(body.created_at)
        : undefined,
    updated_at:
      body.updated_at !== undefined
        ? toISOStringSafe(body.updated_at)
        : undefined,
  };

  // Update enrollment
  const updated = await MyGlobal.prisma.enterprise_lms_enrollments.update({
    where: { id },
    data: updateData,
  });

  // Return updated enrollment, convert Date to string
  return {
    id: updated.id as string & tags.Format<"uuid">,
    learner_id: updated.learner_id as string & tags.Format<"uuid">,
    learning_path_id: updated.learning_path_id as string & tags.Format<"uuid">,
    status: updated.status,
    business_status: updated.business_status ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

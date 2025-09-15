import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates detailed information of a corporate learner by their unique
 * identifier.
 *
 * This operation allows modification of all mutable fields such as email,
 * password_hash, first_name, last_name, and status with tenant isolation
 * enforced using the organizationAdmin's tenant.
 *
 * Email uniqueness within the tenant is validated to avoid conflicts.
 *
 * @param props - Request properties including authorization, learner id, and
 *   update payload
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the update
 * @param props.corporatelearnerId - Unique identifier of the corporate learner
 *   to update
 * @param props.body - The update data payload with optional mutable fields
 * @returns The updated corporate learner entity with latest information
 * @throws {Error} Throws if learner does not exist, unauthorized access, or
 *   email conflict
 */
export async function putenterpriseLmsOrganizationAdminCorporatelearnersCorporatelearnerId(props: {
  organizationAdmin: OrganizationadminPayload;
  corporatelearnerId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCorporateLearner.IUpdate;
}): Promise<IEnterpriseLmsCorporateLearner> {
  const { organizationAdmin, corporatelearnerId, body } = props;

  const learner =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: corporatelearnerId },
    });

  if (!learner) throw new Error("Corporate learner not found");

  if (learner.tenant_id !== organizationAdmin.tenant_id) {
    throw new Error("Unauthorized: Access to learner denied");
  }

  if (body.email !== undefined) {
    const count = await MyGlobal.prisma.enterprise_lms_corporatelearner.count({
      where: {
        tenant_id: learner.tenant_id,
        email: body.email,
        id: { not: corporatelearnerId },
      },
    });

    if (count > 0) throw new Error("Email already in use");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.enterprise_lms_corporatelearner.update({
    where: { id: corporatelearnerId },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      first_name: body.first_name ?? undefined,
      last_name: body.last_name ?? undefined,
      status: body.status ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

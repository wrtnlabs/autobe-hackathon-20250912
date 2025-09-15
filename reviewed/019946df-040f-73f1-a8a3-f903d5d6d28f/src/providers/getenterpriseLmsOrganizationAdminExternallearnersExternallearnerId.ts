import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed external learner information by unique ID.
 *
 * This operation fetches the external learner identified by the provided UUID.
 * Authorization is enforced by verifying that the requesting organization admin
 * belongs to the same tenant as the external learner. Soft-deleted learners are
 * excluded.
 *
 * @param props - Input properties
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.externallearnerId - UUID of the external learner to retrieve
 * @returns The external learner entity matching the ID
 * @throws {Error} When the external learner is not found or unauthorized
 */
export async function getenterpriseLmsOrganizationAdminExternallearnersExternallearnerId(props: {
  organizationAdmin: OrganizationadminPayload;
  externallearnerId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsExternalLearner> {
  const { organizationAdmin, externallearnerId } = props;

  // Fetch external learner with soft delete check
  const externalLearner =
    await MyGlobal.prisma.enterprise_lms_externallearner.findFirst({
      where: {
        id: externallearnerId,
        deleted_at: null,
      },
    });

  if (!externalLearner) {
    throw new Error("External learner not found");
  }

  // Get organization admin info for tenant check
  const orgAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: organizationAdmin.id },
    });

  if (!orgAdmin) {
    throw new Error("Organization admin not found");
  }

  if (externalLearner.tenant_id !== orgAdmin.tenant_id) {
    throw new Error("Unauthorized access to external learner");
  }

  return {
    id: externalLearner.id,
    tenant_id: externalLearner.tenant_id,
    email: externalLearner.email,
    password_hash: externalLearner.password_hash,
    first_name: externalLearner.first_name,
    last_name: externalLearner.last_name,
    status: externalLearner.status,
    created_at: toISOStringSafe(externalLearner.created_at),
    updated_at: toISOStringSafe(externalLearner.updated_at),
    deleted_at: externalLearner.deleted_at
      ? toISOStringSafe(externalLearner.deleted_at)
      : null,
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information of a corporate learner by ID
 *
 * Retrieves detailed information about a specific corporate learner user
 * account identified by its unique user ID. Requires the requester to be a
 * system administrator.
 *
 * @param props - Object containing the system admin info and corporate learner
 *   ID
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.corporatelearnerId - Unique identifier of the corporate learner
 *   user to retrieve
 * @returns Corporate learner user detailed information conforming to
 *   IEnterpriseLmsCorporateLearner
 * @throws {Error} When corporate learner with the specified ID does not exist
 */
export async function getenterpriseLmsSystemAdminCorporatelearnersCorporatelearnerId(props: {
  systemAdmin: SystemadminPayload;
  corporatelearnerId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCorporateLearner> {
  const { systemAdmin, corporatelearnerId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUnique({
      where: { id: corporatelearnerId },
    });

  if (record === null) {
    throw new Error("Corporate learner not found");
  }

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    email: record.email,
    password_hash: record.password_hash,
    first_name: record.first_name,
    last_name: record.last_name,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed external learner information by unique ID.
 *
 * This operation queries the enterprise_lms_externallearner table. Returns all
 * profile attributes, including email, names, status, and tenant association.
 * Enforces that the record is not soft-deleted (deleted_at is null).
 *
 * Authorization requires systemAdmin role with full access rights.
 *
 * @param props - Object containing systemAdmin payload and externallearnerId
 *   UUID
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.externallearnerId - The UUID of the external learner to retrieve
 * @returns Detailed external learner entity matching
 *   IEnterpriseLmsExternalLearner
 * @throws {Error} If no external learner found with given id or unauthorized
 *   access
 */
export async function getenterpriseLmsSystemAdminExternallearnersExternallearnerId(props: {
  systemAdmin: SystemadminPayload;
  externallearnerId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsExternalLearner> {
  const { externallearnerId } = props;
  const record =
    await MyGlobal.prisma.enterprise_lms_externallearner.findUniqueOrThrow({
      where: {
        id: externallearnerId,
        deleted_at: null,
      },
    });

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

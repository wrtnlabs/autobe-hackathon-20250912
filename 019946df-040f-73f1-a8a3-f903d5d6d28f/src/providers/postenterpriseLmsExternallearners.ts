import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";

/**
 * Create a new external learner account.
 *
 * This operation creates and stores a new external learner record in the
 * Enterprise LMS. It enforces tenant association and uniqueness within the
 * tenant's user base.
 *
 * No authentication required; intended for open registration.
 *
 * @param props - Object containing the external learner creation data.
 * @param props.body - The required data for creating an external learner.
 * @returns The created external learner record.
 * @throws {Error} Throws if there is a database constraint violation such as
 *   duplicate email.
 */
export async function postenterpriseLmsExternallearners(props: {
  body: IEnterpriseLmsExternalLearner.ICreate;
}): Promise<IEnterpriseLmsExternalLearner> {
  const { body } = props;
  const createdId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_externallearner.create({
    data: {
      id: createdId,
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: body.password_hash,
      first_name: body.first_name,
      last_name: body.last_name,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

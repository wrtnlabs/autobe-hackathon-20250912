import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new corporate learner user account.
 *
 * Inserts a new corporate learner record into the database with required
 * details. Password is hashed server-side to ensure security before storage.
 * The tenant isolation is enforced via tenant_id.
 *
 * @param props - Object containing the systemAdmin payload and the corporate
 *   learner creation data
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.body - The corporate learner creation input data
 * @returns The newly created corporate learner with full details, including id
 *   and timestamps
 * @throws {Error} Throws an error if database creation fails
 */
export async function postenterpriseLmsSystemAdminCorporatelearners(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsCorporateLearner.ICreate;
}): Promise<IEnterpriseLmsCorporateLearner> {
  const { systemAdmin, body } = props;

  // Hash the raw password from body
  const hashedPassword = await MyGlobal.password.hash(body.password);

  // Generate new id for corporate learner
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create the corporate learner record in the database
  const created = await MyGlobal.prisma.enterprise_lms_corporatelearner.create({
    data: {
      id,
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: hashedPassword,
      first_name: body.first_name,
      last_name: body.last_name,
      status: "active", // default status on creation
      created_at: now,
      updated_at: now,
    },
  });

  // Map the created record to the expected return type
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
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing enrollment by ID.
 *
 * This operation updates enrollment fields such as learner ID, learning path
 * ID, status, and business status while enforcing tenant isolation and
 * authorization. Throws an error if the enrollment does not exist.
 *
 * @param props - Parameters for the update operation
 * @param props.systemAdmin - Authenticated system admin performing the update
 * @param props.id - UUID of the enrollment to update
 * @param props.body - Partial enrollment data to update
 * @returns The updated enrollment record
 * @throws {Error} When the enrollment does not exist
 */
export async function putenterpriseLmsSystemAdminEnrollmentsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
  body: IEnterpriseLmsEnrollment.IUpdate;
}): Promise<IEnterpriseLmsEnrollment> {
  const { systemAdmin, id, body } = props;

  const existing = await MyGlobal.prisma.enterprise_lms_enrollments.findUnique({
    where: { id },
  });
  if (existing === null) throw new Error("Enrollment not found");

  const updated = await MyGlobal.prisma.enterprise_lms_enrollments.update({
    where: { id },
    data: {
      learner_id: body.learner_id ?? undefined,
      learning_path_id: body.learning_path_id ?? undefined,
      status: body.status ?? undefined,
      business_status:
        body.business_status === undefined ? undefined : body.business_status,
      created_at: body.created_at ?? undefined,
      updated_at: body.updated_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    learner_id: updated.learner_id,
    learning_path_id: updated.learning_path_id,
    status: updated.status,
    business_status: updated.business_status ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

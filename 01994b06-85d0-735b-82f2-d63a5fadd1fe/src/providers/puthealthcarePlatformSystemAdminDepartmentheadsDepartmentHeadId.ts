import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update business details of a Department Head record (table:
 * healthcare_platform_departmentheads)
 *
 * This endpoint allows a System Administrator to update a department head's
 * email, name, or phone. It performs uniqueness validation (for email), updates
 * only specified fields, and issues an audit log after a successful mutation.
 * All updates refresh the 'updated_at' timestamp. Handles errors for not found
 * and unique constraint violations. Dates are handled as string &
 * tags.Format<'date-time'>. No use of native Date type.
 *
 * @param props - Props for the update operation
 * @param props.systemAdmin - The authenticated System Administrator performing
 *   the update
 * @param props.departmentHeadId - The department head's UUID, as path parameter
 * @param props.body - The update data for department head (partial update
 *   allowed)
 * @returns The updated IHealthcarePlatformDepartmentHead record
 * @throws {Error} If the department head is not found, or if email is not
 *   unique
 */
export async function puthealthcarePlatformSystemAdminDepartmentheadsDepartmentHeadId(props: {
  systemAdmin: SystemadminPayload;
  departmentHeadId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDepartmentHead.IUpdate;
}): Promise<IHealthcarePlatformDepartmentHead> {
  const { departmentHeadId, body, systemAdmin } = props;
  // Step 1: Fetch existing dept head (throws if not found)
  const current =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findUniqueOrThrow(
      {
        where: { id: departmentHeadId },
      },
    );

  // Step 2: Prepare update data (skip undefined fields)
  const now = toISOStringSafe(new Date());
  try {
    const updated =
      await MyGlobal.prisma.healthcare_platform_departmentheads.update({
        where: { id: departmentHeadId },
        data: {
          email: body.email ?? undefined,
          full_name: body.full_name ?? undefined,
          phone: body.phone !== undefined ? body.phone : undefined,
          updated_at: now,
        },
      });

    // Step 3: Audit log the change (after successful update)
    await MyGlobal.prisma.healthcare_platform_audit_logs.create({
      data: {
        id: v4(),
        user_id: systemAdmin.id,
        organization_id: null, // Not directly tied to an org
        action_type: "DEPARTMENT_HEAD_UPDATE",
        event_context: JSON.stringify({
          departmentHeadId,
          updatedFields: Object.keys(body),
          before: {
            email: current.email,
            full_name: current.full_name,
            phone: current.phone ?? undefined,
          },
          after: {
            email: updated.email,
            full_name: updated.full_name,
            phone: updated.phone ?? undefined,
          },
        }),
        ip_address: undefined,
        related_entity_type: "healthcare_platform_departmentheads",
        related_entity_id: updated.id,
        created_at: now,
      },
    });

    // Step 4: Return result, mapping dates and nullable fields
    return {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      phone: updated.phone ?? undefined,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at != null
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
    };
  } catch (err) {
    // Unique constraint violation (email)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("email")
    ) {
      throw new Error(
        "Email address is already in use by another department head",
      );
    }
    throw err;
  }
}

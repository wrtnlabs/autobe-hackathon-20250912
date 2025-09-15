import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new Department Head in the healthcare platform (table:
 * healthcare_platform_departmentheads)
 *
 * This operation allows platform administrators (system admins) to create a new
 * Department Head, representing clinical or operational leadership. The
 * Department Head is not assigned to an organization or department in this
 * operation; those assignments are handled separately. Only business-verified
 * emails are accepted, and the operation will fail if the email already exists
 * (unique constraint). The created record supports soft deletion and full
 * auditability. All timestamps are in ISO 8601 format, and fields map directly
 * to the domain model.
 *
 * @param props - Request information containing:
 *
 *   - SystemAdmin: Authenticated SystemadminPayload (required, must be present)
 *   - Body: IHealthcarePlatformDepartmentHead.ICreate (required input fields)
 *
 * @returns The created department head record as
 *   IHealthcarePlatformDepartmentHead
 * @throws {Error} If a duplicate email is used (unique constraint violation)
 * @throws {Error} For any other creation error
 */
export async function posthealthcarePlatformSystemAdminDepartmentheads(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformDepartmentHead.ICreate;
}): Promise<IHealthcarePlatformDepartmentHead> {
  const { body } = props;

  const id = v4();
  const now = toISOStringSafe(new Date());

  let created;
  try {
    created = await MyGlobal.prisma.healthcare_platform_departmentheads.create({
      data: {
        id,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone === undefined ? null : body.phone,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2002" &&
      (err as any).meta &&
      (err as any).meta.target &&
      Array.isArray((err as any).meta.target) &&
      (err as any).meta.target.includes("email")
    ) {
      throw new Error("A Department Head with this email already exists.");
    }
    throw err;
  }

  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    phone: created.phone ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

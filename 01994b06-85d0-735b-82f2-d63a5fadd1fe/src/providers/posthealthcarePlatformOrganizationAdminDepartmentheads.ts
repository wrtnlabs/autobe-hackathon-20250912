import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new Department Head in the healthcare platform.
 *
 * This endpoint allows an authenticated Organization Admin to register a new
 * department head user in the system. The department head represents a leader
 * overseeing a clinical or operational department and is only created by
 * privileged admin users. The operation enforces email uniqueness and correct
 * data types for all fields, auditing each creation.
 *
 * Department head assignment to organizations/departments is handled via
 * separate workflows. This operation only creates the user account and does not
 * attach to business structures. All date and ID types are returned as branded
 * strings. Errors thrown for duplicate emails or DB exceptions are surfaced as
 * plain Error.
 *
 * @param props - Arguments for creation
 * @param props.organizationAdmin - The authenticated organization admin user
 *   authorizing this operation
 * @param props.body - Payload with required email, full name, and optional
 *   phone for the new department head
 * @returns Details of the newly created department head, including identifiers
 *   and audit fields
 * @throws {Error} If a department head with the same email already exists
 * @throws {Error} For unexpected database or business rule exceptions
 */
export async function posthealthcarePlatformOrganizationAdminDepartmentheads(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformDepartmentHead.ICreate;
}): Promise<IHealthcarePlatformDepartmentHead> {
  const { organizationAdmin, body } = props;
  // Generate UUID for department head (branded type strictly enforced)
  const id = v4();
  const now = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_departmentheads.create({
        data: {
          id: id,
          email: body.email,
          full_name: body.full_name,
          phone: body.phone ?? null,
          created_at: now,
          updated_at: now,
          // deleted_at left as null
        },
      });
    // Compose response strictly to DTO contract: null for deleted_at omitted, phone optional
    return {
      id: created.id,
      email: created.email,
      full_name: created.full_name,
      phone: created.phone ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: created.deleted_at ?? undefined,
    };
  } catch (err) {
    // Handle unique constraint violation for email
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error("A department head with this email already exists.");
    }
    throw err;
  }
}

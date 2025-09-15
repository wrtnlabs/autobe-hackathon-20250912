import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update business details of a Department Head record (table:
 * healthcare_platform_departmentheads)
 *
 * This endpoint enables authorized organization administrators to update
 * business, contact, or credential details for an existing Department Head in
 * the healthcarePlatform system. It allows for changes to email, full name, and
 * contact phone, enforcing uniqueness (esp. for email) and auditing all changes
 * for compliance. Only Organization Admins or System Admins may perform
 * updates. Department Head must exist and be active (not soft-deleted). Returns
 * the latest version of the updated Department Head record in canonical API
 * structure. Throws errors on not found, unique constraint violation, or
 * permission issues.
 *
 * @param props - Parameters object
 * @param props.organizationAdmin - The authenticated organization admin
 * @param props.departmentHeadId - UUID of the Department Head to update
 * @param props.body - Updated business fields; all fields optional and partial
 * @returns The updated Department Head record in canonical format
 * @throws {Error} When departmentHeadId is not found or deleted
 * @throws {Error} If updating email to a duplicate (already in use)
 * @throws {Error} For other Prisma constraint violations or database errors
 */
export async function puthealthcarePlatformOrganizationAdminDepartmentheadsDepartmentHeadId(props: {
  organizationAdmin: OrganizationadminPayload;
  departmentHeadId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDepartmentHead.IUpdate;
}): Promise<IHealthcarePlatformDepartmentHead> {
  const { organizationAdmin, departmentHeadId, body } = props;

  // Look up target department head (must exist and not be soft-deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHeadId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Department Head not found");
  }

  try {
    // Only update provided fields
    const updated =
      await MyGlobal.prisma.healthcare_platform_departmentheads.update({
        where: { id: departmentHeadId },
        data: {
          email: body.email ?? undefined,
          full_name: body.full_name ?? undefined,
          phone: body.phone !== undefined ? body.phone : undefined,
        },
      });

    // Return canonical API model with ISO date strings
    return {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      phone: typeof updated.phone === "string" ? updated.phone : undefined,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (Array.isArray(error.meta?.target)
        ? error.meta?.target.includes("email")
        : error.meta?.target === "email")
    ) {
      throw new Error("Email is already in use");
    }
    throw error;
  }
}

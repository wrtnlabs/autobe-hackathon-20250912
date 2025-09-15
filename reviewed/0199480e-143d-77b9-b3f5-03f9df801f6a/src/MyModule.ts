import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { LibrarymanagementGuestuserBooksController } from "./controllers/libraryManagement/guestUser/books/LibrarymanagementGuestuserBooksController";

@Module({
  controllers: [
    AuthGuestuserController,
    LibrarymanagementGuestuserBooksController,
  ],
})
export class MyModule {}

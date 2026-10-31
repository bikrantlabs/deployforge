    async sendVerificationEmail(email) {
      const emailHash = hashEmail(email);

      const key = await cacheService.get<string>(
        cacheKeys.emailVerificationCooldown(emailHash),
      );
      if (key) {
        const retryAfterSeconds = Number(config.EMAIL_VERIFICATION_COOLDOWN);
        throw new RateLimitError(
          `Please wait ${retryAfterSeconds} seconds before requesting new code.`,
          retryAfterSeconds,
        );
      }

      const user = await userRepository.findByEmail(email);

      if (!user) {
        throw new UnauthorizedError();
      }

      if (user.isEmailVerified) {
        throw new UserAlreadyVerifiedError();
      }

      const verificationCode = generateVerificationCode();

      await service.cacheCode(email, verificationCode);
      logger.info("Verification code sent!");
    },

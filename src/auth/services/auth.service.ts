import { 
  Injectable, 
  ConflictException, 
  UnauthorizedException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from 'eventemitter2';
import { TokenResponseDto } from '../dto/token-response.dto';
import { bcrypt } from 'bcrypt';
import type { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { ChangePasswordDto } from '../dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { email, password } = registerDto;

    // Verifica se o usuário já existe
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria o usuário
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      verificationToken: this.generateRandomToken(),
    });

    const savedUser = await this.userRepository.save(user);

    // Dispara evento de registro
    this.eventEmitter.emit(
      'user.registered',
      new UserRegisteredEvent({
        userId: savedUser.id,
        email: savedUser.email,
        verificationToken: savedUser.verificationToken,
      })
    );

    return savedUser;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenResponseDto> {
    const { email, password } = loginDto;

    // Encontra o usuário
    const user = await this.userRepository.findOne({ 
      where: { email },
      select: ['id', 'email', 'password', 'role', 'isVerified'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verifica a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verifica se o email foi verificado
    if (!user.isVerified && this.configService.get('REQUIRE_EMAIL_VERIFICATION')) {
      throw new UnauthorizedException('Email not verified');
    }

    // Gera tokens
    return this.generateTokens(user, ipAddress, userAgent);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    const { refreshToken } = refreshTokenDto;

    // Encontra o token no banco de dados
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!token || token.isRevoked || new Date() > token.expiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Gera novos tokens
    return this.generateTokens(token.user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verifica a senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Atualiza a senha
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Não revelamos que o email não existe por questões de segurança
      return;
    }

    // Gera token e expiração
    user.passwordResetToken = this.generateRandomToken();
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hora

    await this.userRepository.save(user);

    // Dispara evento de reset de senha
    this.eventEmitter.emit(
      'password.reset.requested',
      new PasswordResetRequestedEvent({
        userId: user.id,
        email: user.email,
        resetToken: user.passwordResetToken,
      })
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = '';
    user.passwordResetExpires = new Date('2025-01-01');

    await this.userRepository.save(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isVerified = true;
    user.verificationToken = '';

    await this.userRepository.save(user);
  }

  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    };
  }

  private async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RefreshToken> {
    // Revoga tokens antigos
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    // Cria novo token
    const token = this.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + 
      parseInt(this.configService.get('REFRESH_TOKEN_EXPIRES_DAYS') || '7')
    );

    const refreshToken = this.refreshTokenRepository.create({
      token,
      expiresAt,
      isRevoked: false,
      userId,
      ipAddress,
      userAgent,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  private generateRandomToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  async validateUser(payload: JwtPayload): Promise<User | undefined> {
    return this.userService.findById(payload.sub);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoga o token específico
      await this.refreshTokenRepository.update(
        { token: refreshToken, userId },
        { isRevoked: true },
      );
    } else {
      // Revoga todos os tokens do usuário
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }
  }
}
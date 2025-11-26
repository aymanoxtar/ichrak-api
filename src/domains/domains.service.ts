import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Domain } from './entities/domain.entity';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@Injectable()
export class DomainsService {
  constructor(
    @InjectRepository(Domain)
    private domainRepository: Repository<Domain>,
  ) {}

  async create(createDomainDto: CreateDomainDto): Promise<Domain> {
    const existingDomain = await this.domainRepository.findOne({
      where: { type: createDomainDto.type },
    });

    if (existingDomain) {
      throw new ConflictException('Domain type already exists');
    }

    const domain = this.domainRepository.create(createDomainDto);
    return this.domainRepository.save(domain);
  }

  async findAll(): Promise<Domain[]> {
    return this.domainRepository.find({
      relations: ['categories'],
    });
  }

  async findOne(id: string): Promise<Domain> {
    const domain = await this.domainRepository.findOne({
      where: { id },
      relations: ['categories'],
    });

    if (!domain) {
      throw new NotFoundException(`Domain with ID ${id} not found`);
    }

    return domain;
  }

  async update(id: string, updateDomainDto: UpdateDomainDto): Promise<Domain> {
    const domain = await this.findOne(id);

    if (updateDomainDto.type && updateDomainDto.type !== domain.type) {
      const existingDomain = await this.domainRepository.findOne({
        where: { type: updateDomainDto.type },
      });
      if (existingDomain) {
        throw new ConflictException('Domain type already exists');
      }
    }

    Object.assign(domain, updateDomainDto);
    return this.domainRepository.save(domain);
  }

  async remove(id: string): Promise<void> {
    const domain = await this.findOne(id);
    await this.domainRepository.remove(domain);
  }
}

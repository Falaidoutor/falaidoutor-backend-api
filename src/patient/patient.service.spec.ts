import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientService } from './patient.service';

const mockPatient: Patient = {
  id: 1,
  name: 'Maria Oliveira',
  cpf: '98765432100',
  age: 45,
  gender: 'F',
};

describe('PatientService', () => {
  let service: PatientService;
  let repo: jest.Mocked<Repository<Patient>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: getRepositoryToken(Patient),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            merge: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PatientService);
    repo = module.get(getRepositoryToken(Patient));
  });

  describe('findAll', () => {
    it('should return all patients sorted by name', async () => {
      repo.find.mockResolvedValue([mockPatient]);

      const result = await service.findAll();

      expect(result).toEqual([mockPatient]);
      expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });

    it('should return empty array when no patients exist', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a patient when found', async () => {
      repo.findOneBy.mockResolvedValue(mockPatient);

      const result = await service.findById(1);

      expect(result).toEqual(mockPatient);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException when patient not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
      await expect(service.findById(99)).rejects.toThrow('Paciente com ID 99 não encontrado.');
    });
  });

  describe('create', () => {
    it('should create a patient with gender uppercased', async () => {
      const dto: CreatePatientDto = { name: 'Ana', cpf: '11122233344', age: 25, gender: 'f' };
      const entity = { ...dto, gender: 'F' } as Patient;
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue({ id: 2, ...entity });

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({ ...dto, gender: 'F' });
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result.gender).toBe('F');
    });

    it('should keep uppercase gender as is', async () => {
      const dto: CreatePatientDto = { name: 'Carlos', cpf: '55566677788', age: 60, gender: 'M' };
      const entity = { ...dto } as Patient;
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue({ id: 3, ...entity });

      await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({ ...dto, gender: 'M' });
    });
  });

  describe('update', () => {
    it('should update patient and uppercase gender', async () => {
      const dto: UpdatePatientDto = { gender: 'm' };
      const merged = { ...mockPatient, gender: 'M' };

      repo.findOneBy.mockResolvedValue(mockPatient);
      repo.merge.mockReturnValue(merged as Patient);
      repo.save.mockResolvedValue(merged as Patient);

      const result = await service.update(1, dto);

      expect(repo.merge).toHaveBeenCalledWith(mockPatient, { gender: 'M' });
      expect(result.gender).toBe('M');
    });

    it('should keep existing gender when not provided in dto', async () => {
      const dto: UpdatePatientDto = { name: 'Maria Silva' };
      const merged = { ...mockPatient, name: 'Maria Silva' };

      repo.findOneBy.mockResolvedValue(mockPatient);
      repo.merge.mockReturnValue(merged as Patient);
      repo.save.mockResolvedValue(merged as Patient);

      await service.update(1, dto);

      expect(repo.merge).toHaveBeenCalledWith(
        mockPatient,
        expect.objectContaining({ gender: mockPatient.gender }),
      );
    });

    it('should throw NotFoundException when patient not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.update(99, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete patient when found', async () => {
      repo.findOneBy.mockResolvedValue(mockPatient);
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove(1);

      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when patient not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});

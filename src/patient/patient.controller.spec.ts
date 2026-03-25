import { Test, TestingModule } from '@nestjs/testing';
import { Patient } from '../shared/entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

const mockPatient: Patient = {
  id: 1,
  name: 'Maria Oliveira',
  cpf: '98765432100',
  age: 45,
  gender: 'F',
};

describe('PatientController', () => {
  let controller: PatientController;
  let service: jest.Mocked<PatientService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [
        {
          provide: PatientService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PatientController);
    service = module.get(PatientService);
  });

  describe('findAll', () => {
    it('should return all patients', async () => {
      service.findAll.mockResolvedValue([mockPatient]);

      const result = await controller.findAll();

      expect(result).toEqual([mockPatient]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return patient by id', async () => {
      service.findById.mockResolvedValue(mockPatient);

      const result = await controller.findById(1);

      expect(result).toBe(mockPatient);
      expect(service.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create and return new patient', async () => {
      const dto: CreatePatientDto = { name: 'Ana', cpf: '11122233344', age: 25, gender: 'F' };
      service.create.mockResolvedValue({ id: 2, ...dto });

      const result = await controller.create(dto);

      expect(result.id).toBe(2);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update and return patient', async () => {
      const dto: UpdatePatientDto = { name: 'Maria Silva' };
      const updated = { ...mockPatient, name: 'Maria Silva' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should call service remove with id', async () => {
      service.remove.mockResolvedValue();

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});

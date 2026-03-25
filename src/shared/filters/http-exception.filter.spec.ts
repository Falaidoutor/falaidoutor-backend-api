import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
const mockGetRequest = jest.fn().mockReturnValue({ url: '/api/test' });
const mockSwitchToHttp = jest.fn().mockReturnValue({
  getResponse: mockGetResponse,
  getRequest: mockGetRequest,
});

const mockHost = {
  switchToHttp: mockSwitchToHttp,
} as unknown as ArgumentsHost;

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.clearAllMocks();
    mockStatus.mockReturnValue({ json: mockJson });
    mockGetResponse.mockReturnValue({ status: mockStatus });
    mockGetRequest.mockReturnValue({ url: '/api/test' });
    mockSwitchToHttp.mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { message: 'Resource not found', error: 'Not Found', statusCode: 404 },
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Resource not found',
        path: '/api/test',
      }),
    );
  });

  it('should handle HttpException with string response', () => {
    const exception = new HttpException('Simple error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('should handle generic Error with 500 status', () => {
    const exception = new Error('Unexpected failure');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Unexpected failure',
        path: '/api/test',
      }),
    );
  });

  it('should handle unknown exceptions with 500 and default message', () => {
    filter.catch('some string error', mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error' }),
    );
  });

  it('should include timestamp in response', () => {
    const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    const call = mockJson.mock.calls[0][0];
    expect(call).toHaveProperty('timestamp');
    expect(new Date(call.timestamp).getTime()).not.toBeNaN();
  });

  it('should include request path in response', () => {
    const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);
    mockGetRequest.mockReturnValue({ url: '/api/patients/1' });
    mockSwitchToHttp.mockReturnValue({
      getResponse: mockGetResponse,
      getRequest: mockGetRequest,
    });

    filter.catch(exception, mockHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/patients/1' }),
    );
  });
});

import {
  TimestreamWriteClient,
  WriteRecordsCommand,
  _Record as Record,
  Dimension,
  MeasureValueType,
} from '@aws-sdk/client-timestream-write';
import {
  TimestreamQueryClient,
  QueryCommand,
} from '@aws-sdk/client-timestream-query';
import { DataStorage } from '../interfaces/DataStorage';
import { EnergyReading, AggregatedEnergy } from '../types';

/**
 * DataStorageImpl
 * AWS Timestream implementation for energy data persistence
 */
export class DataStorageImpl implements DataStorage {
  private writeClient: TimestreamWriteClient;
  private queryClient: TimestreamQueryClient;
  private databaseName: string;
  private readingsTableName: string;
  private aggregatedTableName: string;

  constructor(
    region: string = 'us-east-1',
    databaseName: string = 'EnergyDatabase',
    readingsTableName: string = 'EnergyReadings',
    aggregatedTableName: string = 'AggregatedEnergy'
  ) {
    this.writeClient = new TimestreamWriteClient({ region });
    this.queryClient = new TimestreamQueryClient({ region });
    this.databaseName = databaseName;
    this.readingsTableName = readingsTableName;
    this.aggregatedTableName = aggregatedTableName;
  }

  /**
   * Store an energy reading in Timestream
   */
  async storeReading(reading: EnergyReading): Promise<void> {
    const dimensions: Dimension[] = [
      {
        Name: 'deviceId',
        Value: reading.deviceId,
      },
    ];

    const records: Record[] = [
      {
        Dimensions: dimensions,
        MeasureName: 'watts',
        MeasureValue: reading.watts.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: reading.timestamp.getTime().toString(),
      },
    ];

    // Add optional voltage and current if present
    if (reading.voltage !== undefined) {
      records.push({
        Dimensions: dimensions,
        MeasureName: 'voltage',
        MeasureValue: reading.voltage.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: reading.timestamp.getTime().toString(),
      });
    }

    if (reading.current !== undefined) {
      records.push({
        Dimensions: dimensions,
        MeasureName: 'current',
        MeasureValue: reading.current.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: reading.timestamp.getTime().toString(),
      });
    }

    const command = new WriteRecordsCommand({
      DatabaseName: this.databaseName,
      TableName: this.readingsTableName,
      Records: records,
    });

    try {
      await this.writeClient.send(command);
    } catch (error) {
      throw new Error(`Failed to store energy reading: ${error}`);
    }
  }

  /**
   * Store aggregated energy data in Timestream
   */
  async storeAggregatedData(data: AggregatedEnergy): Promise<void> {
    const dimensions: Dimension[] = [
      {
        Name: 'deviceId',
        Value: data.deviceId,
      },
      {
        Name: 'period',
        Value: data.period,
      },
    ];

    const records: Record[] = [
      {
        Dimensions: dimensions,
        MeasureName: 'totalKwh',
        MeasureValue: data.totalKwh.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: data.startTime.getTime().toString(),
      },
      {
        Dimensions: dimensions,
        MeasureName: 'averageWatts',
        MeasureValue: data.averageWatts.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: data.startTime.getTime().toString(),
      },
      {
        Dimensions: dimensions,
        MeasureName: 'peakWatts',
        MeasureValue: data.peakWatts.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: data.startTime.getTime().toString(),
      },
      {
        Dimensions: dimensions,
        MeasureName: 'carbonKg',
        MeasureValue: data.carbonKg.toString(),
        MeasureValueType: MeasureValueType.DOUBLE,
        Time: data.startTime.getTime().toString(),
      },
    ];

    const command = new WriteRecordsCommand({
      DatabaseName: this.databaseName,
      TableName: this.aggregatedTableName,
      Records: records,
    });

    try {
      await this.writeClient.send(command);
    } catch (error) {
      throw new Error(`Failed to store aggregated data: ${error}`);
    }
  }

  /**
   * Retrieve energy readings for a device within a time range
   */
  async getReadings(deviceId: string, startTime: Date, endTime: Date): Promise<EnergyReading[]> {
    const query = `
      SELECT 
        deviceId,
        time,
        measure_name,
        measure_value::double as value
      FROM "${this.databaseName}"."${this.readingsTableName}"
      WHERE deviceId = '${deviceId}'
        AND time BETWEEN from_milliseconds(${startTime.getTime()}) 
        AND from_milliseconds(${endTime.getTime()})
      ORDER BY time ASC
    `;

    const command = new QueryCommand({
      QueryString: query,
    });

    try {
      const response = await this.queryClient.send(command);
      return this.parseReadingsFromQueryResult(response.Rows || []);
    } catch (error) {
      throw new Error(`Failed to retrieve energy readings: ${error}`);
    }
  }

  /**
   * Retrieve aggregated data for a device
   */
  async getAggregatedData(
    deviceId: string,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    startTime: Date,
    endTime: Date
  ): Promise<AggregatedEnergy[]> {
    const query = `
      SELECT 
        deviceId,
        period,
        time,
        measure_name,
        measure_value::double as value
      FROM "${this.databaseName}"."${this.aggregatedTableName}"
      WHERE deviceId = '${deviceId}'
        AND period = '${period}'
        AND time BETWEEN from_milliseconds(${startTime.getTime()}) 
        AND from_milliseconds(${endTime.getTime()})
      ORDER BY time ASC
    `;

    const command = new QueryCommand({
      QueryString: query,
    });

    try {
      const response = await this.queryClient.send(command);
      return this.parseAggregatedDataFromQueryResult(response.Rows || [], period);
    } catch (error) {
      throw new Error(`Failed to retrieve aggregated data: ${error}`);
    }
  }

  /**
   * Parse query results into EnergyReading objects
   */
  private parseReadingsFromQueryResult(rows: any[]): EnergyReading[] {
    const readingsMap = new Map<string, Partial<EnergyReading>>();

    rows.forEach((row) => {
      const data = row.Data || [];
      const deviceId = data[0]?.ScalarValue || '';
      const timestamp = new Date(parseInt(data[1]?.ScalarValue || '0'));
      const measureName = data[2]?.ScalarValue || '';
      const value = parseFloat(data[3]?.ScalarValue || '0');

      const key = `${deviceId}-${timestamp.getTime()}`;
      
      if (!readingsMap.has(key)) {
        readingsMap.set(key, {
          id: `${deviceId}-${timestamp.getTime()}`,
          deviceId,
          timestamp,
        });
      }

      const reading = readingsMap.get(key)!;
      
      switch (measureName) {
        case 'watts':
          reading.watts = value;
          break;
        case 'voltage':
          reading.voltage = value;
          break;
        case 'current':
          reading.current = value;
          break;
      }
    });

    return Array.from(readingsMap.values())
      .filter((reading) => reading.watts !== undefined)
      .map((reading) => reading as EnergyReading);
  }

  /**
   * Parse query results into AggregatedEnergy objects
   */
  private parseAggregatedDataFromQueryResult(
    rows: any[],
    period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): AggregatedEnergy[] {
    const aggregatedMap = new Map<string, Partial<AggregatedEnergy>>();

    rows.forEach((row) => {
      const data = row.Data || [];
      const deviceId = data[0]?.ScalarValue || '';
      const periodValue = data[1]?.ScalarValue || '';
      const timestamp = new Date(parseInt(data[2]?.ScalarValue || '0'));
      const measureName = data[3]?.ScalarValue || '';
      const value = parseFloat(data[4]?.ScalarValue || '0');

      const key = `${deviceId}-${timestamp.getTime()}`;
      
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          deviceId,
          period,
          startTime: timestamp,
          endTime: this.calculateEndTime(timestamp, period),
        });
      }

      const aggregated = aggregatedMap.get(key)!;
      
      switch (measureName) {
        case 'totalKwh':
          aggregated.totalKwh = value;
          break;
        case 'averageWatts':
          aggregated.averageWatts = value;
          break;
        case 'peakWatts':
          aggregated.peakWatts = value;
          break;
        case 'carbonKg':
          aggregated.carbonKg = value;
          break;
      }
    });

    return Array.from(aggregatedMap.values())
      .filter((aggregated) => 
        aggregated.totalKwh !== undefined &&
        aggregated.averageWatts !== undefined &&
        aggregated.peakWatts !== undefined &&
        aggregated.carbonKg !== undefined
      )
      .map((aggregated) => aggregated as AggregatedEnergy);
  }

  /**
   * Calculate end time based on start time and period
   */
  private calculateEndTime(startTime: Date, period: 'hourly' | 'daily' | 'weekly' | 'monthly'): Date {
    const endTime = new Date(startTime);
    
    switch (period) {
      case 'hourly':
        endTime.setHours(endTime.getHours() + 1);
        break;
      case 'daily':
        endTime.setDate(endTime.getDate() + 1);
        break;
      case 'weekly':
        endTime.setDate(endTime.getDate() + 7);
        break;
      case 'monthly':
        endTime.setMonth(endTime.getMonth() + 1);
        break;
    }
    
    return endTime;
  }
}
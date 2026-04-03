import type {
  PipelineData,
  PipelineSensor,
  PipelineStage,
  PipelineIntermediate,
  PipelineActuator,
} from '../api/types.ts'

interface Props {
  data: PipelineData
}

function tensorShape(t: number[] | undefined): string {
  if (!t) return ''
  return `[${t.join('x')}]`
}

function formatBandwidth(mbps: number | undefined): string {
  if (mbps == null) return ''
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`
  if (mbps >= 1) return `${mbps.toFixed(0)} Mbps`
  return `${(mbps * 1000).toFixed(0)} kbps`
}

function SensorCard({ sensor }: { sensor: PipelineSensor }) {
  return (
    <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3">
      <div className="text-sm font-semibold text-emerald-800">{sensor.name}</div>
      <div className="mt-0.5 text-xs capitalize text-gray-500">{sensor.type}</div>
      {sensor.resolution && (
        <div className="mt-1 text-xs text-gray-400">{sensor.resolution}</div>
      )}
      {sensor.fps && <div className="text-xs text-gray-400">{sensor.fps} fps</div>}
      {sensor.egress_bandwidth_mbps != null && (
        <div className="mt-1 text-xs font-medium text-emerald-600">
          {formatBandwidth(sensor.egress_bandwidth_mbps)}
        </div>
      )}
      {sensor.output_tensor && (
        <div className="mt-1 font-mono text-xs text-gray-400">
          out: {tensorShape(sensor.output_tensor)}
        </div>
      )}
    </div>
  )
}

function StageCard({ stage }: { stage: PipelineStage }) {
  const isModel = stage.type === 'model'
  const borderColor = isModel ? 'border-blue-400' : 'border-gray-400'
  const bgColor = isModel ? 'bg-blue-50' : 'bg-gray-50'
  const titleColor = isModel ? 'text-blue-800' : 'text-gray-800'

  return (
    <div className={`rounded-lg border-2 p-3 ${borderColor} ${bgColor}`}>
      <div className={`text-sm font-semibold ${titleColor}`}>{stage.name}</div>
      {stage.model_class && (
        <div className="mt-0.5 text-xs capitalize text-gray-500">{stage.model_class}</div>
      )}
      {stage.mapped_to && (
        <div className="mt-1 inline-block rounded bg-white px-1.5 py-0.5 text-xs font-medium text-gray-600">
          {stage.mapped_to}
        </div>
      )}
      {stage.gflops != null && (
        <div className="text-xs text-gray-400">{stage.gflops} GFLOPS</div>
      )}
      {stage.input_tensors && stage.input_tensors.length > 0 && (
        <div className="mt-1 font-mono text-xs text-gray-400">
          in: {stage.input_tensors.map(tensorShape).join(', ')}
        </div>
      )}
      {stage.output_tensors && stage.output_tensors.length > 0 && (
        <div className="font-mono text-xs text-gray-400">
          out: {stage.output_tensors.map(tensorShape).join(', ')}
        </div>
      )}
      {stage.notes && (
        <div className="mt-1 text-xs italic text-gray-400">{stage.notes}</div>
      )}
    </div>
  )
}

function IntermediateCard({ item }: { item: PipelineIntermediate }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-2">
      <div className="text-xs font-semibold text-amber-800">{item.name}</div>
      {item.shape && (
        <div className="font-mono text-xs text-gray-400">{tensorShape(item.shape)}</div>
      )}
      {item.size_mb != null && (
        <div className="text-xs text-gray-400">{item.size_mb} MB</div>
      )}
      {item.notes && <div className="text-xs italic text-gray-400">{item.notes}</div>}
    </div>
  )
}

function ActuatorCard({ actuator }: { actuator: PipelineActuator }) {
  return (
    <div className="rounded-lg border-2 border-rose-400 bg-rose-50 p-3">
      <div className="text-sm font-semibold text-rose-800">{actuator.name}</div>
      <div className="mt-0.5 text-xs capitalize text-gray-500">{actuator.type}</div>
      {actuator.channels != null && (
        <div className="text-xs text-gray-400">{actuator.channels} ch</div>
      )}
      {actuator.ingress_bandwidth_mbps != null && (
        <div className="mt-1 text-xs font-medium text-rose-600">
          {formatBandwidth(actuator.ingress_bandwidth_mbps)}
        </div>
      )}
      {actuator.input_tensor && (
        <div className="mt-1 font-mono text-xs text-gray-400">
          in: {tensorShape(actuator.input_tensor)}
        </div>
      )}
    </div>
  )
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <div className="h-0 w-8 border-t-2 border-gray-300" />
      <div className="text-gray-400">&#9654;</div>
      {label && <div className="text-xs text-gray-400">{label}</div>}
    </div>
  )
}

export default function PipelineView({ data }: Props) {
  return (
    <div className="space-y-6">
      {/* Main pipeline flow */}
      <div className="overflow-x-auto">
        <div className="flex items-start gap-1 pb-4" style={{ minWidth: 'max-content' }}>
          {/* Sensors */}
          <div className="space-y-2">
            <div className="text-center text-xs font-medium uppercase text-gray-500">
              Sensors
            </div>
            {data.sensors.map((s) => (
              <SensorCard key={s.name} sensor={s} />
            ))}
          </div>

          <FlowArrow />

          {/* Processing stages */}
          {data.stages.map((stage, i) => (
            <div key={stage.name} className="flex items-start gap-1">
              <div className="space-y-2">
                <div className="text-center text-xs font-medium uppercase text-gray-500">
                  {i === 0 ? 'Processing' : '\u00A0'}
                </div>
                <StageCard stage={stage} />
              </div>
              {i < data.stages.length - 1 && <FlowArrow />}
            </div>
          ))}

          <FlowArrow />

          {/* Actuators */}
          <div className="space-y-2">
            <div className="text-center text-xs font-medium uppercase text-gray-500">
              Actuators
            </div>
            {data.actuators.map((a) => (
              <ActuatorCard key={a.name} actuator={a} />
            ))}
          </div>
        </div>
      </div>

      {/* Intermediate data structures */}
      {data.intermediates && data.intermediates.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-500">
            Key Intermediate Data Structures
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.intermediates.map((item) => (
              <IntermediateCard key={item.name} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-2 border-emerald-400 bg-emerald-50" />
          Sensor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-2 border-blue-400 bg-blue-50" />
          Model / Operator
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-2 border-gray-400 bg-gray-50" />
          Post-processing
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-amber-400 bg-amber-50" />
          Intermediate Cache
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border-2 border-rose-400 bg-rose-50" />
          Actuator
        </span>
      </div>
    </div>
  )
}

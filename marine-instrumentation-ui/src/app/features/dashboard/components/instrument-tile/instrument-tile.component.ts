import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { InstrumentWidgetComponent } from '../../../instruments/components/instrument-widget/instrument-widget.component';
import { InstrumentContainerComponent } from '../../../../ui/instruments/instrument-container/instrument-container.component';
import { CompassWidgetComponent } from '../../../../ui/instruments/compass-widget/compass-widget.component';
import { SpeedometerWidgetComponent } from '../../../../ui/instruments/speedometer-widget/speedometer-widget.component';
import { DepthGaugeWidgetComponent } from '../../../../ui/instruments/depth-gauge-widget/depth-gauge-widget.component';
import { DepthWidgetComponent } from '../../../../ui/instruments/depth-widget/depth-widget.component';
import { WindWidgetComponent } from '../../../../ui/instruments/wind-widget/wind-widget.component';
import { RudderWidgetComponent } from '../../../../ui/instruments/rudder-widget/rudder-widget.component';
import { EngineRpmWidgetComponent } from '../../../../ui/instruments/engine-rpm-widget/engine-rpm-widget.component';
import { TankWidgetComponent } from '../../../../ui/instruments/tank-widget/tank-widget.component';
import { BatteryWidgetComponent } from '../../../../ui/instruments/battery-widget/battery-widget.component';
import { MeteoWidgetComponent } from '../../../../ui/instruments/meteo-widget/meteo-widget.component';
import { CogInstrumentComponent } from '../../../../ui/instruments/cog-instrument/cog-instrument.component';
import { PositionInstrumentComponent } from '../../../../ui/instruments/position-instrument/position-instrument.component';
import { GpsStatusInstrumentComponent } from '../../../../ui/instruments/gps-status-instrument/gps-status-instrument.component';
import type { InstrumentDefinition } from '../../../instruments/data/instrument-catalog';
import { hasVisualWidget, getVisualWidgetType } from '../../../instruments/data/visual-widget-map';

/**
 * Renders a single catalog instrument as a dashboard tile. Reuses the same
 * container + numeric + visual dispatch as the Instruments page so the two
 * surfaces stay visually identical.
 */
@Component({
  selector: 'app-dashboard-instrument-tile',
  standalone: true,
  imports: [
    InstrumentWidgetComponent,
    InstrumentContainerComponent,
    CompassWidgetComponent,
    SpeedometerWidgetComponent,
    DepthGaugeWidgetComponent,
    DepthWidgetComponent,
    WindWidgetComponent,
    RudderWidgetComponent,
    EngineRpmWidgetComponent,
    TankWidgetComponent,
    BatteryWidgetComponent,
    MeteoWidgetComponent,
    CogInstrumentComponent,
    PositionInstrumentComponent,
    GpsStatusInstrumentComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (instrument) {
      <app-instrument-container
        [title]="instrument.label"
        [instrumentId]="instrument.id"
        size="md"
        [defaultView]="hasVisual ? 'both' : 'numeric'"
        [attr.data-category]="instrument.category"
      >
        <omi-instrument-widget numeric [config]="instrument" [compact]="true" />

        @switch (visualType) {
          @case ('compass') { <app-compass-widget visual /> }
          @case ('speedometer') { <app-speedometer-widget visual /> }
          @case ('depth-gauge') { <app-depth-gauge-widget visual unit="m" /> }
          @case ('depth') { <app-depth-widget visual /> }
          @case ('wind') { <app-wind-widget visual /> }
          @case ('rudder') { <app-rudder-widget visual /> }
          @case ('engine-rpm') { <app-engine-rpm-widget visual /> }
          @case ('tank') { <app-tank-widget visual /> }
          @case ('battery') { <app-battery-widget visual /> }
          @case ('meteo') { <app-meteo-widget visual /> }
          @case ('cog') { <app-cog-instrument visual /> }
          @case ('position') { <app-position-instrument visual /> }
          @case ('gps-status') { <app-gps-status-instrument visual /> }
          @default { <omi-instrument-widget visual [config]="instrument" /> }
        }
      </app-instrument-container>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class InstrumentTileComponent {
  @Input({ required: true }) instrument!: InstrumentDefinition;

  get hasVisual(): boolean {
    return this.instrument ? hasVisualWidget(this.instrument.id) : false;
  }

  get visualType() {
    return this.instrument ? getVisualWidgetType(this.instrument.id) : null;
  }
}

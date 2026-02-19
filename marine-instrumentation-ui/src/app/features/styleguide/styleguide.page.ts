import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppIconButtonComponent } from '../../shared/components/app-icon-button/app-icon-button.component';
import { AppFabComponent } from '../../shared/components/app-fab/app-fab.component';
import { AppButtonGroupComponent } from '../../shared/components/app-button-group/app-button-group.component';
import { AppIconComponent, IconName } from '../../shared/components/app-icon/app-icon.component';
import { AppTextComponent } from '../../shared/components/app-text/app-text.component';
import { AppHeadingComponent } from '../../shared/components/app-heading/app-heading.component';
import { AppLabelComponent } from '../../shared/components/app-label/app-label.component';
import { AppCodeComponent } from '../../shared/components/app-code/app-code.component';
import { AppBadgeComponent } from '../../shared/components/app-badge/app-badge.component';
import { AppChipComponent } from '../../shared/components/app-chip/app-chip.component';
import { AppStatusComponent } from '../../shared/components/app-status/app-status.component';
import { AppProgressComponent } from '../../shared/components/app-progress/app-progress.component';
import { AppSpinnerComponent } from '../../shared/components/app-spinner/app-spinner.component';
import { AppSkeletonComponent } from '../../shared/components/app-skeleton/app-skeleton.component'; //
import { AppInputComponent } from '../../shared/components/app-input/app-input.component';
import { AppTextareaComponent } from '../../shared/components/app-textarea/app-textarea.component';
import { AppCheckboxComponent } from '../../shared/components/app-checkbox/app-checkbox.component';
import { AppRadioComponent } from '../../shared/components/app-radio/app-radio.component';
import { AppSelectComponent } from '../../shared/components/app-select/app-select.component';
import { AppNumberInputComponent } from '../../shared/components/app-number-input/app-number-input.component';
import { AppColorPickerComponent } from '../../shared/components/app-color-picker/app-color-picker.component';
import { AppToggleComponent } from '../../shared/components/app-toggle/app-toggle.component';
import { AppSliderComponent } from '../../shared/components/app-slider/app-slider.component';
import { AppBoxComponent } from '../../shared/components/app-box/app-box.component';
import { AppFlexComponent } from '../../shared/components/app-flex/app-flex.component';
import { AppGridComponent } from '../../shared/components/app-grid/app-grid.component';
import { AppStackComponent } from '../../shared/components/app-stack/app-stack.component';
import { AppDividerComponent } from '../../shared/components/app-divider/app-divider.component';
import { AppSpacerComponent } from '../../shared/components/app-spacer/app-spacer.component';
import { AppTooltipDirective } from '../../shared/components/app-tooltip/app-tooltip.directive';
import { AppPopoverDirective } from '../../shared/components/app-popover/app-popover.directive';
import { AppTabsComponent } from '../../shared/components/composites/app-tabs/app-tabs.component';
import { AppBreadcrumbComponent, BreadcrumbItem } from '../../shared/components/composites/app-breadcrumb/app-breadcrumb.component';
import { AppPaginationComponent } from '../../shared/components/composites/app-pagination/app-pagination.component';
import { AppNavItemComponent } from '../../shared/components/composites/app-nav-item/app-nav-item.component';
import { AppNavGroupComponent, NavItemDef } from '../../shared/components/composites/app-nav-group/app-nav-group.component';
import { AppCardComponent } from '../../shared/components/composites/app-card/app-card.component';
import { AppListItemComponent } from '../../shared/components/composites/app-list-item/app-list-item.component';
import { AppDataRowComponent } from '../../shared/components/composites/app-data-row/app-data-row.component';
import { AppAvatarComponent } from '../../shared/components/composites/app-avatar/app-avatar.component';
import { AppEmptyStateComponent } from '../../shared/components/composites/app-empty-state/app-empty-state.component';
import { AppKeyValueComponent } from '../../shared/components/composites/app-key-value/app-key-value.component';
import { SearchInputComponent } from '../../shared/components/composites/search-input/search-input.component';
import { CoordinateInputComponent } from '../../shared/components/composites/coordinate-input/coordinate-input.component';
import { AngleInputComponent } from '../../shared/components/composites/angle-input/angle-input.component';
import { AppDatePickerComponent } from '../../shared/components/composites/app-date-picker/app-date-picker.component';
import { AppTimePickerComponent } from '../../shared/components/composites/app-time-picker/app-time-picker.component';
import { AppDateRangePickerComponent } from '../../shared/components/composites/app-date-range-picker/app-date-range-picker.component';
import { AppFormFieldComponent } from '../../shared/components/composites/app-form-field/app-form-field.component';
import { AppDialogComponent, DialogAction } from '../../shared/components/composites/app-dialog/app-dialog.component';
import { AppBottomSheetComponent } from '../../shared/components/composites/app-bottom-sheet/app-bottom-sheet.component';
import { AppDropdownComponent } from '../../shared/components/composites/app-dropdown/app-dropdown.component';
import { AppContextMenuComponent } from '../../shared/components/composites/app-context-menu/app-context-menu.component';
import { AppAlertComponent } from '../../shared/components/composites/app-alert/app-alert.component';
import { AppBannerComponent } from '../../shared/components/composites/app-banner/app-banner.component';
import { MenuItem } from '../../shared/components/composites/menu.models';
import { CompassComponent } from '../../shared/components/patterns/compass/compass.component';
import { WindRoseComponent } from '../../shared/components/patterns/wind-rose/wind-rose.component';
import { DepthGaugeComponent } from '../../shared/components/patterns/depth-gauge/depth-gauge.component';
import { SpeedometerComponent } from '../../shared/components/patterns/speedometer/speedometer.component';
import { AttitudeIndicatorComponent } from '../../shared/components/patterns/attitude-indicator/attitude-indicator.component';
import { BarometerComponent } from '../../shared/components/patterns/barometer/barometer.component';
import { BatteryGaugeComponent } from '../../shared/components/patterns/battery-gauge/battery-gauge.component';
import { GPSStatusComponent } from '../../shared/components/patterns/gps-status/gps-status.component';
import { PositionDisplayComponent } from '../../shared/components/patterns/position-display/position-display.component';
import { CourseDisplayComponent } from '../../shared/components/patterns/course-display/course-display.component';
import { WaypointInfoComponent } from '../../shared/components/patterns/waypoint-info/waypoint-info.component';
import { LegInfoComponent } from '../../shared/components/patterns/leg-info/leg-info.component';
import { ETADisplayComponent } from '../../shared/components/patterns/eta-display/eta-display.component';
import { TideDisplayComponent } from '../../shared/components/patterns/tide-display/tide-display.component';
import { AISTargetCardComponent } from '../../shared/components/patterns/ais-target-card/ais-target-card.component';
import { AISTargetListComponent, AISTargetListItem } from '../../shared/components/patterns/ais-target-list/ais-target-list.component';
import { AISTargetDetailsComponent, AISTargetDetailsTarget } from '../../shared/components/patterns/ais-target-details/ais-target-details.component';
import { CPAIndicatorComponent } from '../../shared/components/patterns/cpa-indicator/cpa-indicator.component';
import { AlarmBadgeComponent } from '../../shared/components/patterns/alarm-badge/alarm-badge.component';
import { AlarmItemComponent, AlarmItemData } from '../../shared/components/patterns/alarm-item/alarm-item.component';
import { AlarmListComponent } from '../../shared/components/patterns/alarm-list/alarm-list.component';
import { AlarmBannerPatternComponent } from '../../shared/components/patterns/alarm-banner-pattern/alarm-banner-pattern.component';
import { MobAlertPatternComponent } from '../../shared/components/patterns/mob-alert-pattern/mob-alert-pattern.component';
import { AnchorWatchPatternComponent } from '../../shared/components/patterns/anchor-watch-pattern/anchor-watch-pattern.component';
import { WaypointCardData, WaypointCardPatternComponent } from '../../shared/components/patterns/waypoint-card-pattern/waypoint-card-pattern.component';
import { WaypointListPatternComponent, WaypointReorderEvent } from '../../shared/components/patterns/waypoint-list-pattern/waypoint-list-pattern.component';
import { WaypointFormData, WaypointFormPatternComponent } from '../../shared/components/patterns/waypoint-form-pattern/waypoint-form-pattern.component';
import { RouteCardData, RouteCardPatternComponent } from '../../shared/components/patterns/route-card-pattern/route-card-pattern.component';
import { RouteListPatternComponent } from '../../shared/components/patterns/route-list-pattern/route-list-pattern.component';
import { RouteEditorWaypoint, RouteEditorPatternComponent, RouteEditorReorderEvent } from '../../shared/components/patterns/route-editor-pattern/route-editor-pattern.component';
import { TrackCardData, TrackCardPatternComponent } from '../../shared/components/patterns/track-card-pattern/track-card-pattern.component';
import { GpxImportPatternComponent, GpxImportPreview } from '../../shared/components/patterns/gpx-import-pattern/gpx-import-pattern.component';
import { AutopilotStatusPatternComponent } from '../../shared/components/patterns/autopilot-status-pattern/autopilot-status-pattern.component';
import { AutopilotModeSelectorMode, AutopilotModeSelectorPatternComponent } from '../../shared/components/patterns/autopilot-mode-selector-pattern/autopilot-mode-selector-pattern.component';
import { HeadingControlPatternComponent } from '../../shared/components/patterns/heading-control-pattern/heading-control-pattern.component';
import { AutopilotConsolePatternComponent, AutopilotConsoleStatus } from '../../shared/components/patterns/autopilot-console-pattern/autopilot-console-pattern.component';
import { MapControlOrientation, MapControlsPatternComponent } from '../../shared/components/patterns/map-controls-pattern/map-controls-pattern.component';
import { LayerControlItem, LayerControlPatternComponent } from '../../shared/components/patterns/layer-control-pattern/layer-control-pattern.component';
import { ScaleBarPatternComponent } from '../../shared/components/patterns/scale-bar-pattern/scale-bar-pattern.component';
import { ChartHudFixState, ChartHudNavigationData, ChartHudPatternComponent, ChartHudPosition } from '../../shared/components/patterns/chart-hud-pattern/chart-hud-pattern.component';
import { MiniMapPatternComponent, MiniMapPoint } from '../../shared/components/patterns/mini-map-pattern/mini-map-pattern.component';
import {
  PlaybackControlsPatternComponent,
  PlaybackControlsStatus
} from '../../shared/components/patterns/playback-controls-pattern/playback-controls-pattern.component';
import { TimelineEventItem, TimelinePatternComponent } from '../../shared/components/patterns/timeline-pattern/timeline-pattern.component';
import { PlaybackBarPatternComponent, PlaybackBarPatternControl, PlaybackBarPatternState } from '../../shared/components/patterns/playback-bar-pattern/playback-bar-pattern.component';
import { InstrumentPanelItem, InstrumentPanelWidgetComponent } from '../../shared/components/widgets/instrument-panel-widget/instrument-panel-widget.component';
import {
  NavigationPanelCourse,
  NavigationPanelPosition,
  NavigationPanelRoute,
  NavigationPanelWaypoint,
  NavigationPanelWidgetComponent
} from '../../shared/components/widgets/navigation-panel-widget/navigation-panel-widget.component';
import { AlarmPanelWidgetComponent } from '../../shared/components/widgets/alarm-panel-widget/alarm-panel-widget.component';
import { AisPanelWidgetComponent } from '../../shared/components/widgets/ais-panel-widget/ais-panel-widget.component';
import { ResourcesPanelTab, ResourcesPanelWidgetComponent } from '../../shared/components/widgets/resources-panel-widget/resources-panel-widget.component';
import {
  SettingsPanelChange,
  SettingsPanelItem,
  SettingsPanelWidgetComponent
} from '../../shared/components/widgets/settings-panel-widget/settings-panel-widget.component';

@Component({
  selector: 'app-styleguide',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppButtonComponent,
    AppIconButtonComponent,
    AppFabComponent,
    AppButtonGroupComponent,
    AppIconComponent,
    AppTextComponent,
    AppHeadingComponent,
    AppLabelComponent,
    AppCodeComponent,
    AppBadgeComponent,
    AppChipComponent,
    AppStatusComponent,
    AppProgressComponent,
    AppSpinnerComponent,
    AppSkeletonComponent,
    AppInputComponent,
    AppTextareaComponent,
    AppCheckboxComponent,
    AppRadioComponent,
    AppSelectComponent,
    AppNumberInputComponent,
    AppColorPickerComponent,
    AppToggleComponent,
    AppSliderComponent,
    AppBoxComponent,
    AppFlexComponent,
    AppGridComponent,
    AppStackComponent,
    AppDividerComponent,
    AppSpacerComponent,
    AppTooltipDirective,
    AppPopoverDirective,
    AppTabsComponent,
    AppBreadcrumbComponent,
    AppPaginationComponent,
    AppNavItemComponent,
    AppNavGroupComponent,
    AppCardComponent,
    AppListItemComponent,
    AppDataRowComponent,
    AppAvatarComponent,
    AppEmptyStateComponent,
    AppKeyValueComponent,
    SearchInputComponent,
    CoordinateInputComponent,
    AngleInputComponent,
    AppDatePickerComponent,
    AppTimePickerComponent,
    AppDateRangePickerComponent,
    AppFormFieldComponent,
    AppDialogComponent,
    AppBottomSheetComponent,
    AppDropdownComponent,
    AppContextMenuComponent,
    AppAlertComponent,
    AppBannerComponent,
    CompassComponent,
    WindRoseComponent,
    DepthGaugeComponent,
    SpeedometerComponent,
    AttitudeIndicatorComponent,
    BarometerComponent,
    BatteryGaugeComponent,
    GPSStatusComponent,
    PositionDisplayComponent,
    CourseDisplayComponent,
    WaypointInfoComponent,
    LegInfoComponent,
    ETADisplayComponent,
    TideDisplayComponent,
    AISTargetCardComponent,
    AISTargetListComponent,
    AISTargetDetailsComponent,
    CPAIndicatorComponent,
    AlarmBadgeComponent,
    AlarmItemComponent,
    AlarmListComponent,
    AlarmBannerPatternComponent,
    MobAlertPatternComponent,
    AnchorWatchPatternComponent,
    WaypointCardPatternComponent,
    WaypointListPatternComponent,
    WaypointFormPatternComponent,
    RouteCardPatternComponent,
    RouteListPatternComponent,
    RouteEditorPatternComponent,
    TrackCardPatternComponent,
    GpxImportPatternComponent,
    AutopilotStatusPatternComponent,
    AutopilotModeSelectorPatternComponent,
    HeadingControlPatternComponent,
    AutopilotConsolePatternComponent,
    MapControlsPatternComponent,
    LayerControlPatternComponent,
    ScaleBarPatternComponent,
    ChartHudPatternComponent,
    MiniMapPatternComponent,
    PlaybackControlsPatternComponent,
    TimelinePatternComponent,
    PlaybackBarPatternComponent,
    InstrumentPanelWidgetComponent,
    NavigationPanelWidgetComponent,
    AlarmPanelWidgetComponent,
    AisPanelWidgetComponent,
    ResourcesPanelWidgetComponent,
    SettingsPanelWidgetComponent,
  ],
  template: `
    <div class="styleguide-container">
      <h1>Primitives Styleguide</h1>


      <section>
        <h2>Color Palette (T.1)</h2>
        <div class="color-grid">
          <div class="color-swatch-group">
            <h3>Brand</h3>
            <div class="swatch" style="background: var(--primary)">Primary</div>
            <div class="swatch" style="background: var(--accent)">Accent</div>
            <div class="swatch" style="background: var(--marine-blue)">Marine Blue</div>
            <div class="swatch" style="background: var(--marine-dark)">Marine Dark</div>
          </div>
          
          <div class="color-swatch-group">
            <h3>Status</h3>
            <div class="swatch" style="background: var(--success); color: var(--success-text);">Success</div>
            <div class="swatch" style="background: var(--warn); color: var(--warn-text);">Warn</div>
            <div class="swatch" style="background: var(--danger); color: var(--danger-text);">Danger</div>
            <div class="swatch" style="background: var(--info); color: #fff;">Info</div>
          </div>
          
           <div class="color-swatch-group">
            <h3>Neutrals</h3>
            <div class="swatch" style="background: var(--bg-app); border: 1px solid var(--border); color: var(--text-primary)">App Bg</div>
            <div class="swatch" style="background: var(--bg-surface); border: 1px solid var(--border); color: var(--text-primary)">Surface</div>
            <div class="swatch" style="background: var(--bg-surface-secondary); border: 1px solid var(--border); color: var(--text-primary)">Surface 2</div>
            <div class="swatch" style="background: var(--border); color: var(--text-primary)">Border</div>
          </div>
        </div>
      </section>
      
      <section>
        <h2>Spacing Tokens (T.2)</h2>
        <div class="grid">
          <div class="spacing-box" style="width: var(--space-4); height: var(--space-4);">4</div>
          <div class="spacing-box" style="width: var(--space-8); height: var(--space-8);">8</div>
          <div class="spacing-box" style="width: var(--space-12); height: var(--space-12);">12</div>
          <div class="spacing-box" style="width: var(--space-16); height: var(--space-16);">16</div>
        </div>
        <div class="p-4 bg-surface-2 mt-4">
           Example of .p-4 padding
        </div>
      </section>

      <section>
        <h2>Typography Primitives (P.3, P.4)</h2>
        <div class="grid col w-full">
          <div>
            <app-heading [level]="1">Heading 1 (Default)</app-heading>
            <app-heading [level]="2">Heading 2 (Default)</app-heading>
            <app-heading [level]="3">Heading 3 (Default)</app-heading>
            <app-heading [level]="4">Heading 4</app-heading>
            <app-heading [level]="5">Heading 5</app-heading>
            <app-heading [level]="6" color="muted">Heading 6 (Muted)</app-heading>
          </div>
          <div class="grid gap-2">
             <app-text variant="body">Body Default: The quick brown fox jumps over the lazy dog.</app-text>
             <app-text variant="caption">Caption: Essential for compact UI elements.</app-text>
             <app-text variant="overline">OVERLINE / LABEL</app-text>
             <app-text variant="code">Code: 12.4 V</app-text>
             <app-text color="warn">Text with explicit color (Warn)</app-text>
             <app-text color="#00ff00" weight="bold">Text with custom hex color</app-text>
             <app-text [truncate]="true" style="width: 150px; display: block;">
               Truncated text example that is very long and should be cut off
             </app-text>
          </div>
          <div class="bg-surface-2 p-4">
             <app-text variant="overline">SOG</app-text>
             <app-text variant="value" size="4xl">7.4</app-text>
             <app-text variant="caption">knots</app-text>
          </div>

          <div class="grid col w-full mt-4" style="border-top: 1px solid var(--border); padding-top: 1rem;">
            <app-heading [level]="5">Labels & Code (P.5, P.6)</app-heading>
            
            <div class="grid gap-4" style="align-items: flex-start;">
               <div class="grid col gap-2">
                 <app-label [required]="true">Input Label Required</app-label>
                 <app-label>Standard Label</app-label>
                 <app-label [disabled]="true">Disabled Label</app-label>
               </div>
               
               <div class="grid col gap-2" style="flex: 1;">
                  <app-text>Use <app-code>ctrl + c</app-code> to copy.</app-text>
                  <app-code variant="block">
// TypeScript Example
interface Vessel {{ '{' }}
  name: string;
  mmsi: number;
{{ '}' }}</app-code>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>Icons (P.1)</h2>
        <div class="grid">
          <div class="icon-box"><app-icon name="anchor"></app-icon><span>anchor</span></div>
          <div class="icon-box"><app-icon name="wind"></app-icon><span>wind</span></div>
          <div class="icon-box"><app-icon name="speedometer"></app-icon><span>speed</span></div>
          <div class="icon-box"><app-icon name="compass"></app-icon><span>compass</span></div>
          <div class="icon-box"><app-icon name="depth"></app-icon><span>depth</span></div>
          <div class="icon-box"><app-icon name="battery"></app-icon><span>battery</span></div>
          <div class="icon-box"><app-icon name="warning" class="text-warn"></app-icon><span>warn</span></div>
          <div class="icon-box"><app-icon name="error" class="text-danger"></app-icon><span>error</span></div>
          <div class="icon-box"><app-icon name="ais"></app-icon><span>ais</span></div>
          <div class="icon-box"><app-icon name="vessel"></app-icon><span>vessel</span></div>
        </div>
      </section>

      <section>
        <h2>Shadow Tokens (T.4)</h2>
        <div class="grid w-full">
           <div class="shadow-box shadow-sm">SM</div>
           <div class="shadow-box shadow-md">MD</div>
           <div class="shadow-box shadow-lg">LG</div>
           <div class="shadow-box shadow-xl">XL</div>
           <div class="shadow-box shadow-2xl">2XL</div>
           <div class="shadow-box shadow-inner">Inner</div>
        </div>
      </section>

      <section>
        <h2>Border Tokens (T.5)</h2>
        <div class="grid w-full">
           <div class="border-box rounded-sm">SM</div>
           <div class="border-box rounded-md">MD (Default)</div>
           <div class="border-box rounded-lg">LG</div>
           <div class="border-box rounded-full" style="width: 100px;">Pill</div>
           <div class="border-box rounded-none">None</div>
        </div>
      </section>

      <section>
        <h2>Animation Tokens (T.6)</h2>
        <div class="grid w-full">
           <div class="anim-box flex-col">
             <div class="swatch bg-surface-2 animate-spin mb-2" style="border-radius: 50%; width: 40px; height: 40px; border: 4px solid var(--primary); border-top-color: transparent;"></div>
             <span class="text-xs">Spin</span>
           </div>
           
           <div class="anim-box flex-col">
             <div class="swatch bg-surface-2 animate-pulse mb-2" style="width: 40px; height: 40px; background: var(--success); border-radius: 50%;"></div>
             <span class="text-xs">Pulse</span>
           </div>

           <div class="anim-box flex-col">
              <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                <div class="animate-ping" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: var(--danger); opacity: 0.75;"></div>
                <div style="position: relative; width: 12px; height: 12px; border-radius: 50%; background: var(--danger);"></div>
              </div>
              <span class="text-xs mt-4">Ping (Alarm)</span>
           </div>

           <div class="anim-box flex-col">
             <div class="swatch animate-flash mb-2" style="width: 40px; height: 40px; background: var(--warn); border-radius: 4px;"></div>
             <span class="text-xs">Flash</span>
           </div>
        </div>
      </section>

      <section>
        <h2>Breakpoints & Z-Index (T.7 & T.8)</h2>
        <div class="grid col">
          <div class="card p-4">
             <h3>Responsive Check</h3>
             <div class="responsive-box">
                Resize window to see change
             </div>
          </div>
          
          <div class="card p-4">
             <h3>Z-Index Stack</h3>
             <div class="z-stack">
               <div class="z-layer z-10">10</div>
               <div class="z-layer z-20">20</div>
               <div class="z-layer z-30">30</div>
             </div>
          </div>
        </div>
      </section>

      <section>
        <h2>Buttons (P.7)</h2>
        <div class="grid col gap-4 w-full">
           <div class="grid gap-2">
             <app-button variant="primary">Primary</app-button>
             <app-button variant="secondary">Secondary</app-button>
             <app-button variant="outline">Outline</app-button>
             <app-button variant="ghost">Ghost</app-button>
             <app-button variant="danger">Danger</app-button>
             <app-button variant="warning">Warning</app-button>
             <app-button variant="link">Link Button</app-button>
           </div>
           
           <div class="grid gap-2 items-center">
             <app-button size="xs" variant="secondary">XS</app-button>
             <app-button size="sm" variant="secondary">Small</app-button>
             <app-button size="md" variant="secondary">Medium</app-button>
             <app-button size="lg" variant="secondary">Large</app-button>
             <app-button size="xl" variant="secondary">Extra Large</app-button>
           </div>

           <div class="grid gap-2">
             <app-button variant="primary" [loading]="true">Loading</app-button>
             <app-button variant="primary" iconLeft="settings">Icon Left</app-button>
             <app-button variant="primary" iconRight="arrow-right">Icon Right</app-button>
             <app-button variant="secondary" iconLeft="anchor" [active]="true">Active State</app-button>
             <app-button variant="secondary" [disabled]="true">Disabled</app-button>
           </div>

           <div class="w-full">
             <app-button [fullWidth]="true" variant="primary">Full Width Button</app-button>
           </div>
        </div>
      </section>

      <section>
        <h2>Icon Buttons (P.8)</h2>
        <div class="grid col gap-4 w-full">
           <div class="grid gap-2 items-center">
              <app-icon-button icon="settings" label="Settings" variant="ghost"></app-icon-button>
              <app-icon-button icon="close" label="Close" variant="secondary"></app-icon-button>
              <app-icon-button icon="plus" label="Add" variant="primary"></app-icon-button>
              <app-icon-button icon="warning" label="Alert" variant="danger"></app-icon-button>
              <app-icon-button icon="anchor" label="Anchor" variant="outline"></app-icon-button>
           </div>
           
           <div class="grid gap-2 items-center">
              <app-icon-button icon="menu" label="XS" size="xs" variant="secondary"></app-icon-button>
              <app-icon-button icon="menu" label="SM" size="sm" variant="secondary"></app-icon-button>
              <app-icon-button icon="menu" label="MD" size="md" variant="secondary"></app-icon-button>
              <app-icon-button icon="menu" label="LG" size="lg" variant="secondary"></app-icon-button>
              <app-icon-button icon="menu" label="XL" size="xl" variant="secondary"></app-icon-button>
           </div>
        </div>
      </section>

      <section>
        <h2>FAB (P.9)</h2>
        <div class="grid col gap-4 w-full">
           <div class="grid gap-4 items-center">
              <app-fab icon="plus" label="Add" variant="primary"></app-fab>
              <app-fab icon="navigation" label="Navigate" variant="secondary"></app-fab>
              <app-fab icon="warning" label="Alert" variant="warn"></app-fab>
           </div>
           
            <div class="grid gap-4 items-center">
              <app-fab icon="plus" label="New Waypoint" [extended]="true" variant="primary"></app-fab>
              <app-fab icon="anchor" label="Drop Anchor" [extended]="true" variant="secondary"></app-fab>
           </div>
           
           <div class="grid gap-4 items-center">
              <app-fab icon="plus" size="sm" variant="primary"></app-fab>
              <app-fab icon="plus" size="md" variant="primary"></app-fab>
              <app-fab icon="plus" size="lg" variant="primary"></app-fab>
           </div>
        </div>
      </section>

      <section>
        <h2>Button Group (P.10)</h2>
        <div class="grid col gap-4 w-full">
           <app-text variant="caption">Horizontal</app-text>
           <app-button-group>
             <app-button variant="secondary" icon="minus"></app-button>
             <app-button variant="secondary">100%</app-button>
             <app-button variant="secondary" icon="plus"></app-button>
           </app-button-group>
           
           <app-button-group>
             <app-button variant="outline" [active]="true">Day</app-button>
             <app-button variant="outline">Night</app-button>
             <app-button variant="outline">Auto</app-button>
           </app-button-group>
           
           <app-text variant="caption">Vertical</app-text>
           <app-button-group orientation="vertical">
             <app-button variant="secondary" icon="zoom-in"></app-button>
             <app-button variant="secondary" icon="zoom-out"></app-button>
             <app-button variant="secondary" icon="center"></app-button>
           </app-button-group>
        </div>
      </section>

      <section>
        <h2>Badge (P.11)</h2>
        <div class="grid col gap-6 w-full">
           
           <div class="grid col gap-2">
             <app-heading level="4">Sizes</app-heading>
             <div class="flex gap-4 items-center">
               <app-badge size="sm" variant="neutral">Small</app-badge>
               <app-badge size="md" variant="neutral">Medium</app-badge>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">Variants</app-heading>
             <div class="flex gap-4 flex-wrap">
               <app-badge variant="neutral">Neutral</app-badge>
               <app-badge variant="info">Info</app-badge>
               <app-badge variant="success">Success</app-badge>
               <app-badge variant="warning">Warning</app-badge>
               <app-badge variant="danger">Danger</app-badge>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">With Dot</app-heading>
             <div class="flex gap-4 flex-wrap">
               <app-badge variant="neutral" [dot]="true">Offline</app-badge>
               <app-badge variant="success" [dot]="true">Online</app-badge>
               <app-badge variant="warning" [dot]="true">Degraded</app-badge>
               <app-badge variant="danger" [dot]="true">Error</app-badge>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">With Pulse</app-heading>
             <div class="flex gap-4 flex-wrap">
               <app-badge variant="success" [dot]="true" [pulse]="true">Live</app-badge>
               <app-badge variant="danger" [dot]="true" [pulse]="true">Critical</app-badge>
             </div>
           </div>
        </div>
      </section>

      <section>
        <h2>Chip (P.12)</h2>
        <div class="grid col gap-6 w-full">
           
           <div class="grid col gap-2">
             <app-heading level="4">Variants</app-heading>
             <div class="flex gap-4 flex-wrap">
               <app-chip variant="neutral">Neutral</app-chip>
               <app-chip variant="primary">Primary</app-chip>
               <app-chip variant="input">Input</app-chip>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">With Icon</app-heading>
             <div class="flex gap-4 flex-wrap">
                <app-chip variant="neutral" icon="anchor">Anchor</app-chip>
                <app-chip variant="primary" icon="navigation">Navigating</app-chip>
             </div>
           </div>
           
           <div class="grid col gap-2">
             <app-heading level="4">Interactive States</app-heading>
             <div class="flex gap-4 flex-wrap">
               <app-chip variant="primary" [selected]="true">Selected</app-chip>
               <app-chip variant="input" [selected]="false">Unselected</app-chip>
               <app-chip variant="input" [selected]="true">Input Selected</app-chip>
               <app-chip variant="neutral" [disabled]="true">Disabled</app-chip>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">Removable</app-heading>
             <div class="flex gap-4 flex-wrap">
               <app-chip variant="neutral" [removable]="true">Tag 1</app-chip>
               <app-chip variant="primary" [removable]="true">Filter: Wind</app-chip>
               <app-chip variant="input" [removable]="true" [selected]="true">Filter: Active</app-chip>
             </div>
           </div>

        </div>
      </section>

      <section>
        <h2>Status (P.13)</h2>
        <div class="grid col gap-6 w-full">
           
           <div class="grid col gap-2">
             <app-heading level="4">Variants</app-heading>
             <div class="flex gap-8 flex-wrap">
               <app-status variant="neutral">Disconnected</app-status>
               <app-status variant="success">Connected</app-status>
               <app-status variant="warning">Degraded</app-status>
               <app-status variant="danger">Error</app-status>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">With Pulse</app-heading>
             <div class="flex gap-8 flex-wrap">
               <app-status variant="success" [pulse]="true">Live Stream</app-status>
               <app-status variant="danger" [pulse]="true">Alarm Active</app-status>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">With Icon</app-heading>
             <div class="flex gap-8 flex-wrap">
            <app-status variant="neutral" icon="alert-triangle">Offline</app-status>
            <app-status variant="success" icon="activity">Online</app-status>
            <app-status variant="warning" icon="battery">Charging</app-status>
             </div>
           </div>

        </div>
      </section>

      <section>
        <h2>Progress (P.14)</h2>
        <div class="grid col gap-6 w-full">
           
           <div class="grid col gap-2">
             <app-heading level="4">Variants</app-heading>
             <app-progress [value]="40" variant="primary"></app-progress>
             <app-progress [value]="60" variant="success"></app-progress>
             <app-progress [value]="80" variant="warning"></app-progress>
             <app-progress [value]="95" variant="danger"></app-progress>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">With Label & Sizes</app-heading>
             <app-progress [value]="30" [showLabel]="true" size="sm" unit="%"></app-progress>
             <app-progress [value]="50" [showLabel]="true" size="md" unit="knots" [max]="100"></app-progress>
             <app-progress [value]="750" [showLabel]="true" size="lg" unit="rpm" [max]="1000"></app-progress>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">Indeterminate</app-heading>
             <app-progress [indeterminate]="true" variant="primary"></app-progress>
           </div>
        </div>
      </section>

      <section>
        <h2>Spinner (P.15)</h2>
        <div class="grid col gap-6 w-full">
           
           <div class="grid col gap-2">
             <app-heading level="4">Sizes</app-heading>
             <div class="flex gap-4 items-end">
               <app-spinner size="xs"></app-spinner>
               <app-spinner size="sm"></app-spinner>
               <app-spinner size="md"></app-spinner>
               <app-spinner size="lg"></app-spinner>
               <app-spinner size="xl"></app-spinner>
             </div>
           </div>

           <div class="grid col gap-2">
             <app-heading level="4">Colors</app-heading>
             <div class="flex gap-4 items-end">
               <app-spinner color="primary"></app-spinner>
               <app-spinner color="secondary"></app-spinner>
               <div class="p-2 bg-primary rounded">
                 <app-spinner color="white"></app-spinner>
               </div>
             </div>
           </div>
        </div>
      </section>

      <section>
        <h2>Skeleton (P.16)</h2>
        <div class="grid col gap-6 w-full">
           <div class="grid gap-4 w-full" style="grid-template-columns: auto 1fr; align-items: center;">
             <app-skeleton variant="circle" width="48px" height="48px"></app-skeleton>
             <div class="grid col gap-2 w-full">
                <app-skeleton variant="text" width="60%"></app-skeleton>
                <app-skeleton variant="text" width="40%"></app-skeleton>
             </div>
           </div>
           
           <div class="grid col gap-2 w-full">
              <app-skeleton variant="rect" width="100%" height="150px"></app-skeleton>
              <app-skeleton variant="text"></app-skeleton>
              <app-skeleton variant="text"></app-skeleton>
           </div>
        </div>
      </section>

      <section>
        <h2>Form Primitives (P.17 - P.25)</h2>
        <div class="grid col gap-6 w-full" style="max-width: 500px">
           
           <div class="grid col gap-4">
             <app-heading level="4">Input (P.17)</app-heading>
             <div class="grid col gap-2">
                <app-label>Standard Input</app-label>
                <app-input placeholder="Type something..."></app-input>
             </div>

             <div class="grid col gap-2">
                <app-label>With Icon & Clearable</app-label>
                <app-input placeholder="Filter..." icon="search" [clearable]="true" [(ngModel)]="input1"></app-input>
                <app-text variant="caption">Value: {{ input1 }}</app-text>
             </div>

             <div class="grid col gap-2">
                <app-label>Error State</app-label>
                <app-input placeholder="Enter email" error="Invalid email address" value="invalid-email"></app-input>
             </div>

             <div class="grid col gap-2">
                <app-label>Disabled</app-label>
                <app-input placeholder="Can't touch this" [disabled]="true" value="Read only"></app-input>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Textarea (P.18)</app-heading>
             <div class="grid col gap-2">
                <app-label>Standard Textarea</app-label>
                <app-textarea placeholder="Enter description..." [rows]="3"></app-textarea>
             </div>

             <div class="grid col gap-2">
                <app-label>With Character Count</app-label>
                <app-textarea placeholder="Max 100 chars" [maxLength]="100" [showCount]="true"></app-textarea>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Select (P.19)</app-heading>
             <div class="grid col gap-2">
                <app-label>Standard Select</app-label>
                <app-select 
                  [options]="selectOptions" 
                  [(ngModel)]="selectValue" 
                  placeholder="Choose an instrument"
                ></app-select>
                <app-text variant="caption">Value: {{ selectValue }}</app-text>

                <app-label>Disabled</app-label>
                <app-select 
                  [options]="selectOptions" 
                  [disabled]="true" 
                  placeholder="Cannot choose"
                ></app-select>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Checkbox (P.20)</app-heading>
             <div class="grid col gap-2">
                <app-checkbox [(ngModel)]="checkbox1">Accept terms and conditions</app-checkbox>
                <app-text variant="caption">Value: {{ checkbox1 }}</app-text>
                
                <app-checkbox [ngModel]="true" [disabled]="true">Disabled Checked</app-checkbox>
                <app-checkbox [ngModel]="false" [disabled]="true">Disabled Unchecked</app-checkbox>
                <app-checkbox [indeterminate]="true">Indeterminate</app-checkbox>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Radio Group (P.21)</app-heading>
             <div class="grid col gap-2">
                <app-radio name="opts" value="opt1" [(ngModel)]="radioValue">Option One</app-radio>
                <app-radio name="opts" value="opt2" [(ngModel)]="radioValue">Option Two</app-radio>
                <app-radio name="opts" value="opt3" [(ngModel)]="radioValue" [disabled]="true">Option Three (Disabled)</app-radio>
                
                <app-text variant="caption">Selected Value: {{ radioValue }}</app-text>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Toggle (P.22)</app-heading>
             <div class="grid col gap-2">
                <div class="flex gap-4 items-center">
                    <app-toggle [(ngModel)]="toggle1" label="Toggle Me"></app-toggle>
                    <app-text variant="caption">Value: {{ toggle1 }}</app-text>
                </div>
                <app-toggle [(ngModel)]="toggle2" label="Disabled State" [disabled]="true"></app-toggle>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Slider (P.23)</app-heading>
             <div class="grid col gap-2">
                <app-slider [(ngModel)]="slider1" [min]="0" [max]="100" label="Volume Control"></app-slider>
                <app-slider [(ngModel)]="slider2" [min]="0" [max]="10" [step]="0.1" label="Precision (Step 0.1)"></app-slider>
                <app-text variant="caption">Values: {{ slider1 }}, {{ slider2 }}</app-text>

                <app-slider [ngModel]="75" label="Disabled" [disabled]="true"></app-slider>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Number Input (P.24)</app-heading>
             <div class="grid col gap-2">
                <app-label>Standard (0-100, step 5)</app-label>
                <div class="flex gap-4 items-center">
                  <app-number-input 
                    [(ngModel)]="numberVal" 
                    [min]="0" 
                    [max]="100" 
                    [step]="5">
                  </app-number-input>
                  <app-text variant="caption">Val: {{ numberVal }}</app-text>
                </div>
                
                <app-label>Disabled</app-label>
                <app-number-input [ngModel]="50" [disabled]="true"></app-number-input>
             </div>
           </div>

           <div class="grid col gap-4">
             <app-heading level="4">Color Picker (P.25)</app-heading>
             <div class="grid col gap-2">
                <app-label>Pick a color</app-label>
                <div class="grid col gap-2" style="max-width: 200px">
                  <app-color-picker [(ngModel)]="colorVal"></app-color-picker>
                </div>
             </div>
           </div>

        </div>
      </section>

      <section>
        <h2>Layout Primitives (P.26 - P.31)</h2>
        <div class="grid col gap-4">
          <app-heading level="4">Box (P.26)</app-heading>
          <div class="grid gap-4">
            <app-box padding="4" bg="surface-2" border="true" radius="md">
              <app-text>Box with padding 4, surface-2 bg, border and radius md</app-text>
            </app-box>
            <app-box padding="2" bg="accent" radius="md" shadow="md">
              <app-text style="color: white">Box with Accent BG and Shadow</app-text>
            </app-box>
          </div>

          <app-heading level="4">Flex (P.27)</app-heading>
          <div class="grid gap-4">
             <app-flex gap="2" align="center">
                <app-box bg="surface-2" padding="2" border="true">Item 1</app-box>
                <app-box bg="surface-2" padding="2" border="true">Item 2</app-box>
                <app-box bg="surface-2" padding="2" border="true">Item 3</app-box>
             </app-flex>
             
             <app-flex justify="between" bg="surface-1" padding="2" border="true">
                <span>Left</span>
                <span>Right</span>
             </app-flex>
          </div>

          <app-heading level="4">Grid (P.28)</app-heading>
          <div class="grid gap-4">
            <app-grid columns="3" gap="2">
               <app-box bg="surface-2" padding="2">Cell 1</app-box>
               <app-box bg="surface-2" padding="2">Cell 2</app-box>
               <app-box bg="surface-2" padding="2">Cell 3</app-box>
               <app-box bg="surface-2" padding="2">Cell 4</app-box>
            </app-grid>

            <app-grid columns="200px 1fr" gap="4">
               <app-box bg="accent" padding="2"><strong style="color:white">Sidebar</strong></app-box>
               <app-box bg="surface-1" padding="2" border="true">Main Content</app-box>
            </app-grid>
          </div>

          <app-heading level="4" class="mt-4">Stack (P.29)</app-heading>
          <div class="grid gap-4 col">
             <app-box bg="surface-1" border="true" padding="2">
                <app-stack direction="column" spacing="sm" [divider]="true">
                   <span>Item A with divider</span>
                   <span>Item B with divider</span>
                   <span>Item C with divider</span>
                </app-stack>
             </app-box>
             
             <app-box bg="surface-1" border="true" padding="2">
                <app-stack direction="row" spacing="md" align="center">
                   <app-badge variant="info">Tag 1</app-badge>
                   <app-badge variant="success">Tag 2</app-badge>
                   <span>Text in row</span>
                </app-stack>
             </app-box>
          </div>

          <app-heading level="4" class="mt-4">Divider (P.30)</app-heading>
          <div class="grid col gap-4" style="width: 100%">
             <app-box bg="surface-1" border="true" padding="4">
                <p>Paragraph 1</p>
                <app-divider></app-divider>
                <p>Paragraph 2</p>
                <app-divider variant="dashed" label="Optional Label"></app-divider>
                <p>Paragraph 3</p>
                <app-divider variant="dotted" label="Start Label" labelPosition="start"></app-divider>
                <p>Paragraph 4</p>
             </app-box>
             
             <app-box bg="surface-1" border="true" padding="2">
                <div style="height: 50px; display: flex; align-items: center;">
                   <span>Left</span>
                   <app-divider orientation="vertical" style="height: 30px"></app-divider>
                   <span>Center</span>
                   <app-divider orientation="vertical" variant="dashed" style="height: 30px"></app-divider>
                   <span>Right</span>
                </div>
             </app-box>
          </div>

          <app-heading level="4" class="mt-4">Spacer (P.31)</app-heading>
          <div class="grid col gap-4" style="width: 100%">
             <app-box bg="surface-1" border="true" padding="2">
                <app-text>Block 1</app-text>
                <app-spacer size="xl"></app-spacer>
                <app-text>Block 2 (After XL spacer)</app-text>
                <app-spacer size="50"></app-spacer>
                <app-text>Block 3 (After 50px spacer)</app-text>
             </app-box>
             
             <app-box bg="surface-1" border="true" padding="2">
                <div style="display: flex; align-items: center">
                  <app-button size="sm">Left</app-button>
                  <app-spacer axis="horizontal" size="2rem"></app-spacer>
                  <app-button size="sm" variant="secondary">Right (2rem spaced)</app-button>
                </div>
             </app-box>
          </div>
        </div>
      </section>



      <section>
        <h2>Tooltip (P.32)</h2>
        <div class="grid">
             <app-button 
                variant="secondary" 
                appTooltip="Tooltip Left" 
                tooltipPosition="left">
                Left
              </app-button>
              <app-button 
                variant="secondary" 
                appTooltip="Tooltip Top" 
                tooltipPosition="top">
                Top
              </app-button>
              <app-button 
                variant="secondary" 
                appTooltip="Tooltip Bottom" 
                tooltipPosition="bottom">
                Bottom
              </app-button>
              <app-button 
                variant="secondary" 
                appTooltip="Tooltip Right" 
                tooltipPosition="right">
                Right
              </app-button>
        </div>
      </section>

      <!-- Popover -->
      <section class="component-showcase" id="popover">
        <h2>Popover (P.33)</h2>
        <app-text>Contenedores flotantes activados por clic para contenido más complejo.</app-text>

        <div class="showcase-content mt-4">
          <div class="variants-grid">
            <app-button 
              variant="primary" 
              [appPopover]="popoverContent" 
              popoverPosition="bottom">
              Click for Popover
            </app-button>
            
            <app-button 
              variant="ghost" 
              [appPopover]="simpleContent" 
              popoverPosition="right">
              Simple String
            </app-button>
          </div>
        </div>
      </section>

      <ng-template #popoverContent>
        <div style="min-width: 200px;">
          <app-heading level="5">Popover Title</app-heading>
          <p style="margin: 0.5rem 0; font-size: 0.9rem;">This is a rich content popover with a complex layout.</p>
          <app-button size="sm" variant="secondary" fullWidth="true">Action</app-button>
        </div>
      </ng-template>

      <ng-template #simpleContent>
        <strong>Simple HTML</strong> content works too.
      </ng-template>

      <!-- Composites -->

      <section>
        <h2>Component: Tabs (C.1)</h2>
        <div class="grid gap-4">
          
          <div class="bg-surface-2 p-4 rounded">
            <h3>Line Variant (Default)</h3>
            <app-tabs 
              [items]="demoTabs" 
              variant="line"
              [(activeTab)]="activeTab1"
            ></app-tabs>
            <div class="p-4 bg-surface mt-2 rounded border">
              Active content: {{ activeTab1 }}
            </div>
          </div>

          <div class="bg-surface-2 p-4 rounded">
            <h3>Pills Variant</h3>
            <app-tabs 
              [items]="demoTabsWithIcons" 
              variant="pills"
              [(activeTab)]="activeTab2"
            ></app-tabs>
          </div>

          <div class="bg-surface-2 p-4 rounded">
            <h3>Segment Variant</h3>
            <app-tabs 
              [items]="demoTabs" 
              variant="segment"
              [(activeTab)]="activeTab3"
            ></app-tabs>
          </div>

           <div class="bg-surface-2 p-4 rounded">
            <h3>Vertical Orientation (Line)</h3>
            <div class="flex" style="height: 200px; border: 1px solid var(--border);">
              <app-tabs 
                [items]="demoTabsWithIcons" 
                variant="line"
                orientation="vertical"
                [(activeTab)]="activeTab4"
              ></app-tabs>
              <div class="p-4 flex-1 bg-surface">
                 Content for {{ activeTab4 }}
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- Breadcrumb Section -->
      <section>
        <h2>Breadcrumbs</h2>
        <div class="bg-surface-2 p-4 rounded">
          <app-breadcrumb [items]="demoBreadcrumb"></app-breadcrumb>
        </div>
      </section>

      <!-- Pagination Section -->
      <section>
        <h2>Pagination</h2>
        <div class="grid col" style="max-width: 100%;">
          
          <div class="bg-surface-2 p-4 rounded">
            <h3>Basic (Few Pages)</h3>
            <app-pagination 
              [total]="50" 
              [pageSize]="10" 
              [(current)]="currentPage1"
              (currentChange)="onPageChange($event)"
            ></app-pagination>
            <div class="mt-2 text-xs text-secondary">Current Page: {{ currentPage1 }}</div>
          </div>

          <div class="bg-surface-2 p-4 rounded">
            <h3>Complex (Many Pages)</h3>
            <app-pagination 
              [total]="500" 
              [pageSize]="20" 
              [(current)]="currentPage2"
              [showSizeChanger]="true"
              (currentChange)="currentPage2 = $event; onPageChange($event)"
              (pageSizeChange)="pageSize = $event"
            ></app-pagination>
             <div class="mt-2 text-xs text-secondary">Current Page: {{ currentPage2 }} (Page Size: {{ pageSize }})</div>
          </div>

        </div>
      </section>

      <!-- Navigation Section -->
      <section>
        <h2>Navigation Items</h2>
        <div class="grid" style="align-items: flex-start;">
          
          <div class="bg-surface-2 p-4 rounded" style="width: 250px;">
            <h3>Individual Items</h3>
            <app-nav-item label="Home" icon="home"></app-nav-item>
            <app-nav-item label="Active Page" icon="compass" [active]="true"></app-nav-item>
            <app-nav-item label="With Badge" icon="alarm" badge="3"></app-nav-item>
            <app-nav-item label="Disabled" icon="settings" [disabled]="true"></app-nav-item>
          </div>

          <div class="bg-surface-2 p-4 rounded" style="width: 250px;">
            <h3>Nav Group (Data Driven)</h3>
            <app-nav-group 
              label="Main Menu" 
              [items]="navItems"
            ></app-nav-group>
          </div>

          <div class="bg-surface-2 p-4 rounded" style="width: 250px;">
             <h3>Nav Group (Collapsible + Projected)</h3>
             <app-nav-group label="Settings" [collapsible]="true" [expanded]="false">
                <app-nav-item label="General" icon="settings"></app-nav-item>
                <app-nav-item label="Units" icon="battery"></app-nav-item>
             </app-nav-group>
          </div>

        </div>
      </section>

      <section>
        <h2>Cards (C.6)</h2>
        <div class="grid" style="align-items: flex-start; gap: 2rem;">
          
          <div class="grid col">
            <app-card header="Default Card" footer="Footer Content">
              <p>This is a standard card content. It has a header and a footer.</p>
            </app-card>
            
            <app-card variant="outlined" header="Outlined Card">
              <p>This card has an outline style and no footer.</p>
            </app-card>
            
            <app-card variant="elevated">
              <div header>
                 <app-flex align="center" gap="0.5rem">
                   <app-icon name="alert-triangle" class="text-warning"></app-icon>
                   <span>Custom Header</span>
                 </app-flex>
              </div>
              <p>This card uses elevated style and custom header content via projection.</p>
            </app-card>
          </div>

          <div class="grid col">
            <app-card variant="ghost" header="Ghost Card">
              <p>Ghost card blends with background.</p>
            </app-card>

            <app-card [hoverable]="true" header="Hoverable Card" (clicked)="onCardClick()">
              <p>Hover me! I am interactive.</p>
            </app-card>
            
            <app-card [selected]="true" header="Selected Card">
              <p>I am currently selected.</p>
            </app-card>
          </div>

        </div>
      </section>

      <section>
        <h2>List Item (C.7)</h2>
        <div class="grid col" style="max-width: 600px;">
          <app-card>
             <app-list-item primary="Single Line Item" [hoverable]="true"></app-list-item>
             <app-list-item primary="Item with Icon" leadingIcon="anchor" [hoverable]="true" [divider]="true"></app-list-item>
             <app-list-item primary="Two line item" secondary="Secondary text description" leadingIcon="compass" [hoverable]="true" [divider]="true"></app-list-item>
             <app-list-item primary="Selected Item" secondary="Active state" leadingIcon="check" [selected]="true" [divider]="true"></app-list-item>
             <app-list-item primary="With Trailing" trailing="Value" leadingIcon="battery" [hoverable]="true" [divider]="true"></app-list-item>
             <app-list-item primary="With Trailing Icon" trailingIcon="chevron-right" leadingIcon="settings" [hoverable]="true"></app-list-item>
          </app-card>
        </div>
      </section>

      <section>
        <h2>Data Row (C.8)</h2>
        <div class="grid col" style="max-width: 400px;">
          <app-card header="Instrument Data">
             <app-data-row label="SOG" value="5.2" unit="kn" icon="speedometer" trend="up"></app-data-row>
             <app-data-row label="Depth" value="12.4" unit="m" icon="depth" trend="flat"></app-data-row>
             <app-data-row label="True Wind" value="15.8" unit="kn" icon="wind" trend="down"></app-data-row>
             <app-data-row label="Battery" value="13.2" unit="V" icon="battery"></app-data-row>
          </app-card>
        </div>
      </section>

      <section>
        <h2>Avatar (C.9)</h2>
        <div class="grid">
             <app-avatar src="https://i.pravatar.cc/150?u=a042581f4e29026024d" size="xl" status="online"></app-avatar>
             <app-avatar src="https://i.pravatar.cc/150?u=a042581f4e29026704d" size="lg" status="away"></app-avatar>
             <app-avatar name="Captain Jack" size="md" status="busy"></app-avatar>
             <app-avatar name="First Mate" size="sm" status="offline"></app-avatar>
             <app-avatar size="md"></app-avatar> <!-- Fallback icon -->
        </div>
      </section>

      <section>
        <h2>Empty State (C.10)</h2>
        <div style="border: 1px dashed var(--border); border-radius: 8px;">
           <app-empty-state 
             icon="search" 
             title="No Results Found" 
             description="We couldn't find any targets matching your criteria. Try adjusting your filters."
             actionLabel="Clear Filters"
             (action)="onAction()">
           </app-empty-state>
        </div>
      </section>

      <section>
         <h2>Key Value (C.11)</h2>
          <div class="grid col" style="max-width: 400px; gap: 2rem;">
            <app-card header="Vertical Layout">
               <app-key-value label="MMSI" value="235489000" orientation="vertical" [copyable]="true"></app-key-value>
               <app-divider></app-divider>
               <app-key-value label="Call Sign" value="MDI45" orientation="vertical"></app-key-value>
               <app-divider></app-divider>
               <app-key-value label="Length" value="12.5" unit="m" orientation="vertical"></app-key-value>
            </app-card>

            <app-card header="Horizontal Layout">
               <app-key-value label="Latitude" value="42° 14.50' N" orientation="horizontal" [copyable]="true"></app-key-value>
               <app-divider></app-divider>
               <app-key-value label="Longitude" value="008° 43.20' W" orientation="horizontal" [copyable]="true"></app-key-value>
               <app-divider></app-divider>
               <app-key-value label="Status" value="Moored" orientation="horizontal"></app-key-value>
            </app-card>
          </div>
      </section>

      <!-- SECTION: INPUTS COMPUESTOS (2.3) -->
      <section id="composites-inputs">
        <h1 class="text-3xl font-bold mb-8">Composites: Inputs</h1>

        <h2>Search Input (C.12)</h2>
        <div class="grid col" style="max-width: 400px; gap: 1rem;">
          <app-search-input 
            placeholder="Search charts..." 
            (search)="onSearch($event)">
          </app-search-input>
          
          <app-search-input 
            placeholder="Search with loading..." 
            [loading]="loadingSearch"
            (search)="onSearch($event)">
          </app-search-input>

          <app-search-input 
            placeholder="Search with suggestions (Type 'a')" 
            [suggestions]="['Anchor', 'Angle', 'Apparent Wind', 'AIS Target']"
            (search)="onSearch($event)">
          </app-search-input>

           <app-search-input 
            placeholder="Disabled search" 
            [disabled]="true">
          </app-search-input>
        </div>

        <h2>Coordinate Input (C.16)</h2>
        <div class="grid col" style="max-width: 400px; gap: 1rem;">
           <app-coordinate-input
             [lat]="editLat"
             [lon]="editLon"
             (coordinateChange)="onCoordinateChange($event)"
             (mapSelect)="onMapSelectLog()">
           </app-coordinate-input>
           
           <div class="mt-2 text-sm text-tertiary">
             Result: {{ editLat | number:'1.4-4' }}, {{ editLon | number:'1.4-4' }}
           </div>

           <app-coordinate-input
             label="Read-only Position"
             [lat]="42.5"
             [lon]="-8.5"
             [readonly]="true">
           </app-coordinate-input>
        </div>

        <h2>Angle Input (C.17)</h2>
        <div class="grid" style="gap: 2rem;">
          <app-card header="Heading Selection">
            <app-angle-input
              label="Target Heading"
              [value]="angleValue"
              (valueChange)="onAngleChange($event)">
            </app-angle-input>
          </app-card>
          
          <app-card header="Wind Angle">
            <app-angle-input
              label="AWA Limit"
              [value]="120"
              [max]="180"
              [min]="0"
              unit="°"
              [showDial]="true">
            </app-angle-input>
          </app-card>
        </div>

        <h2>Date & Time Pickers (C.13, C.14, C.15)</h2>
        <div class="grid" style="gap: 2rem; align-items: flex-start;">
          <app-card header="Date Pickers">
             <div class="grid col gap-4">
               <app-date-picker label="Select Date" [(ngModel)]="dateValue"></app-date-picker>
               <app-date-picker label="Min/Max Constraint" min="2023-01-01" max="2023-12-31"></app-date-picker>
             </div>
          </app-card>

          <app-card header="Time Pickers">
             <div class="grid col gap-4">
               <app-time-picker label="Select Time" [(ngModel)]="timeValue"></app-time-picker>
               <app-time-picker label="With Seconds" [step]="1"></app-time-picker>
             </div>
          </app-card>

          <app-card header="Date Range">
             <app-date-range-picker 
                label="Voyage Duration" 
                [(ngModel)]="dateRangeValue"
                min="2024-01-01">
             </app-date-range-picker>
          </app-card>
        </div>

        <h2>Form Field Wrapper (C.18)</h2>
        <div class="grid col" style="max-width: 400px;">
           <app-form-field label="Username" hint="This will be displayed on AIS">
              <app-input placeholder="Enter username"></app-input>
           </app-form-field>

           <app-form-field label="MMSI" error="Invalid MMSI checksum" [required]="true">
              <app-number-input [(ngModel)]="numberVal"></app-number-input>
           </app-form-field>
        </div>

      </section>

      <!-- SECTION: FEEDBACK COMPOUNDS (2.4) -->
      <section class="style-section overlay-section">
        <div class="section-header">
          <h2>Overlays (C.19 - C.22)</h2>
          <p class="section-subtitle">Lightweight triggers with clear hierarchy and spacing.</p>
        </div>
        
        <div class="demo-row">
          <app-button (click)="openDialog()">Open Dialog</app-button>
          <app-button (click)="openBottomSheet()" variant="secondary">Open Bottom Sheet</app-button>
        </div>

        <app-dialog 
          [open]="dialogOpen" 
          title="Confirm Navigation" 
          message="Are you sure you want to navigate to this waypoint? The current route will be cleared." 
          variant="warning"
          [actions]="dialogActions"
          (close)="dialogOpen = false">
        </app-dialog>

        <app-bottom-sheet 
          [open]="sheetOpen" 
          title="Waypoint Details" 
          (close)="sheetOpen = false">
          
          <div class="p-4 grid gap-4">
             <app-key-value label="Name" value="WP-001"></app-key-value>
             <app-key-value label="Coordinates" value="42° 15.5' N, 008° 45.2' W"></app-key-value>
             <app-key-value label="Distance" value="12.5 NM"></app-key-value>
             <app-button fullWidth (click)="sheetOpen = false">Navigate To</app-button>
          </div>
        </app-bottom-sheet>
      </section>

      <section class="style-section overlay-section">
        <div class="section-header">
          <h2>Advanced Overlays (C.23 - C.24)</h2>
          <p class="section-subtitle">Menus and context actions with clear affordances.</p>
        </div>
        <div class="demo-grid">
          <div class="demo-card">
            <h3>Dropdowns</h3>
            <div class="demo-row">
                <app-dropdown [items]="dropdownItems" placement="bottom-start">
                    <app-button iconRight="chevron-down">Dropdown Menu</app-button>
                </app-dropdown>

                <app-dropdown [items]="dropdownItems" placement="top-start">
                    <app-button variant="secondary" iconLeft="settings">Top Menu</app-button>
                </app-dropdown>
            </div>
          </div>

          <div class="demo-card">
             <h3>Context Menu</h3>
             <app-box 
                class="context-demo"
                padding="xl" 
                border="1px dashed var(--border)"
                radius="md"
                (contextmenu)="onRightClick($event)"
                style="cursor: context-menu;">
                <app-text variant="body" color="muted">Right-click inside this box to show context menu</app-text>
             </app-box>
             
             <app-context-menu 
                [items]="contextMenuItems" 
                [isVisible]="contextMenuVisible" 
                [position]="contextMenuPosition"
                (closeMenu)="contextMenuVisible = false">
             </app-context-menu>
          </div>
        </div>
      </section>

      <!-- Feedback Composites Section -->
      <section id="feedback-composites" class="style-section feedback-section">
        <div class="section-header">
          <h2>Feedback Composites (C.27 - C.28)</h2>
          <p class="section-subtitle">Status, alerts, and attention cues with consistent spacing.</p>
        </div>
        
        <div class="demo-grid">
          <div class="demo-card">
            <h3>Banners (C.28)</h3>
            <div class="demo-stack">
                <app-banner type="info" message="System update available (v2.1.0)" actionLabel="Update"></app-banner>
                <app-banner type="warning" message="No GPS connection detected. Please check wiring." [dismissible]="true"></app-banner>
                <app-banner type="error" message="Battery voltage critical (10.5V)" [dismissible]="true"></app-banner>
            </div>
          </div>

          <div class="demo-card">
           <h3>Alerts (C.27)</h3>
           <div class="demo-stack">
              <app-alert type="info" title="Information" message="The system is running optimally with no errors reported."></app-alert>
              
              <app-alert type="success" title="Course Set" message="Autopilot engaged on heading 240°.">
                  <div style="margin-top: 8px;">
                      <app-code>Status: ENGAGED</app-code>
                  </div>
              </app-alert>
              
              <app-alert 
                 type="warning" 
                 title="Shallow Water" 
                 message="Depth is below 3.0m. Proceed with caution." 
                 [closable]="true">
              </app-alert>
              
              <app-alert 
                 type="error" 
                 title="Connection Lost" 
                 message="Signal K server unreachable. Check network configuration." 
                 actionLabel="Retry"
                 (onAction)="onAction()"> 
              </app-alert>
           </div>
          </div>
        </div>
      </section>

      <section class="style-section nautical-section">
        <div class="section-header">
          <h2>Nautical Patterns (Level 3)</h2>
          <p class="section-subtitle">Instrument-focused visuals with strong legibility.</p>
        </div>
        <h3>Compass (N.1)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
               <app-stack spacing="md" align="center">
                 <app-text variant="caption">Standard</app-text>
                 <app-compass [heading]="45" [size]="250"></app-compass>
               </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
               <app-stack spacing="md" align="center">
                 <app-text variant="caption">With COG & Bearing</app-text>
                 <app-compass [heading]="300" [cog]="310" [bearingTo]="350" [size]="250"></app-compass>
               </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Wind Rose (N.2)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
               <app-stack spacing="md" align="center">
                 <app-text variant="caption">Standard (Apparent)</app-text>
                 <app-wind-rose
                  [awa]="-30"
                  [aws]="12.5"
                  [size]="250">
                </app-wind-rose>
               </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
               <app-stack spacing="md" align="center">
                 <app-text variant="caption">True & Apparent</app-text>
                 <app-wind-rose
                  [awa]="30" 
                  [aws]="18.2"
                  [twa]="45"
                  [tws]="15.4"
                  [size]="250">
                </app-wind-rose>
               </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Depth Gauge (N.3)</h3>
        <div class="compass-grid">
             <app-depth-gauge [depth]="12.4" unit="m"></app-depth-gauge>
             <app-depth-gauge [depth]="2.8" unit="m" [shallowThreshold]="3.0"></app-depth-gauge>
             <app-depth-gauge [depth]="1.2" unit="m" [alarmThreshold]="1.5"></app-depth-gauge>
             <app-depth-gauge [depth]="0.5" unit="m" [alarmThreshold]="1.5"></app-depth-gauge>
        </div>

        <h3 class="mt-4">Speedometer (N.4)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Idle</app-text>
                    <app-speedometer [speed]="0" [size]="200"></app-speedometer>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Cruising</app-text>
                    <app-speedometer [speed]="6.4" [target]="7.0" [size]="200"></app-speedometer>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Max Speed</app-text>
                    <app-speedometer [speed]="14.2" [max]="15" [size]="200"></app-speedometer>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Attitude Indicator (N.5)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Level</app-text>
                    <app-attitude-indicator [pitch]="0" [roll]="0" [size]="200"></app-attitude-indicator>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Climb Right</app-text>
                    <app-attitude-indicator [pitch]="10" [roll]="20" [size]="200"></app-attitude-indicator>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Dive Left</app-text>
                    <app-attitude-indicator [pitch]="-5" [roll]="-15" [size]="200"></app-attitude-indicator>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Barometer (N.6)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Low Pressure (Storm)</app-text>
                    <app-barometer [pressure]="975" trend="falling" [size]="200"></app-barometer>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Steady (Standard)</app-text>
                    <app-barometer [pressure]="1013" trend="steady" [size]="200"></app-barometer>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">High Pressure (Fair)</app-text>
                    <app-barometer [pressure]="1032" trend="rising" [size]="200"></app-barometer>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Battery Gauge (N.7)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">House Bank (Discharge)</app-text>
                    <app-battery-gauge 
                        [voltage]="12.4" 
                        [soc]="65" 
                        [current]="-4.2" 
                        [size]="200">
                    </app-battery-gauge>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Engine (Charging)</app-text>
                    <app-battery-gauge 
                        [voltage]="14.2" 
                        [soc]="95" 
                        [current]="25.0" 
                        [charging]="true"
                        [size]="200">
                    </app-battery-gauge>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">Critical Low</app-text>
                    <app-battery-gauge 
                        [voltage]="10.8" 
                        [soc]="15" 
                        [current]="-2.0" 
                        [size]="200">
                    </app-battery-gauge>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">GPS Status (N.8)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">3D Fix (High Accuracy)</app-text>
                    <app-gps-status fixState="3d" [satellites]="12" [hdop]="0.8"></app-gps-status>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">2D Fix (Medium)</app-text>
                    <app-gps-status fixState="2d" [satellites]="5" [hdop]="2.5"></app-gps-status>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md" align="center">
                    <app-text variant="caption">No Fix / Searching</app-text>
                    <app-gps-status fixState="no-fix" [satellites]="0" [hdop]="99.9"></app-gps-status>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Position Display (N.9)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">DDM Format (Default)</app-text>
                    <app-position-display 
                        [lat]="42.2405" 
                        [lon]="-8.7206" 
                        format="DDM"
                        [copyable]="true">
                    </app-position-display>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">DMS Format</app-text>
                    <app-position-display 
                        [lat]="36.1234" 
                        [lon]="-5.5678" 
                        format="DMS"
                        [copyable]="true">
                    </app-position-display>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                    <app-text variant="caption">DD Format</app-text>
                    <app-position-display 
                        [lat]="-33.8688" 
                        [lon]="151.2093" 
                        format="DD"
                        [copyable]="true">
                    </app-position-display>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Course Display (N.10)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">Standard Navigation</app-text>
                    <app-course-display 
                        [sog]="5.2" 
                        [cog]="0.785" 
                        [heading]="0.8" 
                        unit="kn">
                    </app-course-display>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">High Speed (Metric)</app-text>
                    <app-course-display 
                        [sog]="12.5" 
                        [cog]="3.14" 
                        [heading]="3.10" 
                        unit="km/h">
                    </app-course-display>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">Small Size</app-text>
                    <app-course-display 
                        [sog]="3.5" 
                        [cog]="1.5" 
                        [heading]="1.5" 
                        size="sm">
                    </app-course-display>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Waypoint Info (N.11)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">Active Waypoint</app-text>
                    <app-waypoint-info 
                        name="WP-ALPHA"
                        [distance]="32450"
                        [bearing]="0.52"
                        [ttg]="4520"
                        [xtd]="-25">
                    </app-waypoint-info>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">Arrival Imminent</app-text>
                    <app-waypoint-info 
                        name="HARBOR-ENTRANCE"
                        [distance]="850"
                        [bearing]="3.10"
                        [ttg]="185"
                        [xtd]="5">
                    </app-waypoint-info>
                </app-stack>
             </app-box>
             
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="caption">Off Track (Right)</app-text>
                    <app-waypoint-info 
                        name="SAND-BANK"
                        [distance]="12500"
                        [bearing]="1.2"
                        [ttg]="1200"
                        [xtd]="850">
                    </app-waypoint-info>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">Leg Info (N.12)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="overline">Active Leg</app-text>
                    <app-leg-info
                        fromName="Vigo"
                        toName="Cies Islands"
                        [bearingTrue]="4.712"
                        [distanceTotal]="18520"
                        [distanceGo]="9260">
                    </app-leg-info>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="overline">Just Started</app-text>
                    <app-leg-info
                        fromName="Porto"
                        toName="Lisbon"
                        [bearingTrue]="3.14"
                        [distanceTotal]="300000"
                        [distanceGo]="295000">
                    </app-leg-info>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="overline">Arrival</app-text>
                    <app-leg-info
                        fromName="Bayona"
                        toName="Marina"
                        [bearingTrue]="0.5"
                        [distanceTotal]="500"
                        [distanceGo]="50">
                    </app-leg-info>
                </app-stack>
             </app-box>
        </div>

        <h3 class="mt-4">ETA Display (N.13)</h3>
        <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="overline">Cruising</app-text>
                    <app-eta-display
                        eta="2026-02-03T18:45:00"
                        [ttg]="7200"
                        [dtg]="18520"
                        [vmg]="5.0">
                    </app-eta-display>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="overline">Arriving Soon</app-text>
                    <app-eta-display
                        eta="2026-02-03T16:50:00"
                        [ttg]="300"
                        [dtg]="500"
                        [vmg]="3.2">
                    </app-eta-display>
                </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                <app-stack spacing="md">
                    <app-text variant="overline">No Data</app-text>
                    <app-eta-display>
                    </app-eta-display>
                </app-stack>
             </app-box>
        </div>

         <h3 class="mt-4">Tide Display (N.14)</h3>
         <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                     <app-text variant="overline">Rising / High Soon</app-text>
                     <app-tide-display
                         [height]="2.8"
                         state="rising"
                         [nextHigh]="{ time: getFutureDate(1.5), height: 3.2 }"
                         [nextLow]="{ time: getFutureDate(7.5), height: 0.8 }">
                     </app-tide-display>
                 </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                     <app-text variant="overline">Falling / Low Soon</app-text>
                     <app-tide-display
                         [height]="1.2"
                         state="falling"
                         [nextHigh]="{ time: getFutureDate(9), height: 3.1 }"
                         [nextLow]="{ time: getFutureDate(2), height: 0.5 }">
                     </app-tide-display>
                 </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                     <app-text variant="overline">Slack / High Tide</app-text>
                     <app-tide-display
                         [height]="3.4"
                         state="slack"
                         [nextHigh]="{ time: getFutureDate(12), height: 3.3 }"
                         [nextLow]="{ time: getFutureDate(6), height: 0.6 }">
                     </app-tide-display>
                 </app-stack>
             </app-box>
         </div>

         <h3 class="mt-4">AIS Target Card (N.15)</h3>
         <div class="compass-grid">
             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                     <app-text variant="overline">Safe Target</app-text>
                     <app-ais-target-card
                        mmsi="205551234"
                        name="ST MARY"
                        callsign="FGHJ"
                        [distance]="12.4"
                        [bearing]="245"
                        status="safe">
                     </app-ais-target-card>
                 </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                     <app-text variant="overline">Warning (Low TCPA)</app-text>
                     <app-ais-target-card
                        mmsi="338123456"
                        name="FAST FERRY"
                        [distance]="3.2"
                        [bearing]="012"
                        [cpa]="0.8"
                        [tcpa]="600"
                        status="warning">
                     </app-ais-target-card>
                 </app-stack>
             </app-box>

             <app-box class="compass-card" padding="4">
                 <app-stack spacing="md">
                     <app-text variant="overline">Danger (Collision Course)</app-text>
                     <app-ais-target-card
                        mmsi="512000000"
                        name="CONTAINER SHIP"
                        [distance]="1.1"
                        [bearing]="180"
                        [cpa]="0.1"
                        [tcpa]="120"
                        status="danger">
                     </app-ais-target-card>
                 </app-stack>
             </app-box>
         </div>

         <h3 class="mt-4">AIS Target List (N.16)</h3>
         <div class="demo-grid">
             <app-ais-target-list
                [targets]="aisTargets"
                sortBy="distance">
             </app-ais-target-list>

             <app-ais-target-list
                [targets]="aisTargets"
                sortBy="tcpa"
                filter="warning">
             </app-ais-target-list>

             <app-ais-target-list
                [targets]="[]"
                [loading]="true">
             </app-ais-target-list>

             <app-ais-target-list
                [targets]="[]">
             </app-ais-target-list>
         </div>

         <h3 class="mt-4">AIS Target Details (N.17)</h3>
         <div class="demo-grid">
             <app-ais-target-details
               [target]="aisTargetDetails">
             </app-ais-target-details>

             <app-ais-target-details
               [target]="aisTargetWarning">
             </app-ais-target-details>
         </div>

         <h3 class="mt-4">CPA Indicator (N.18)</h3>
         <div class="demo-grid">
             <app-cpa-indicator
               [cpa]="1.2"
               [tcpa]="1800"
               [threshold]="{ cpa: 0.5, tcpa: 900 }">
             </app-cpa-indicator>

             <app-cpa-indicator
               [cpa]="0.4"
               [tcpa]="600"
               [threshold]="{ cpa: 0.5, tcpa: 900 }">
             </app-cpa-indicator>

             <app-cpa-indicator
               [cpa]="0.1"
               [tcpa]="120"
               [threshold]="{ cpa: 0.5, tcpa: 900 }">
             </app-cpa-indicator>
         </div>

         <h3 class="mt-4">Alarm Badge (N.19)</h3>
         <div class="demo-grid">
             <app-alarm-badge [count]="0" severity="none"></app-alarm-badge>
             <app-alarm-badge [count]="2" severity="warning"></app-alarm-badge>
             <app-alarm-badge [count]="6" severity="critical" [pulse]="true"></app-alarm-badge>
             <app-alarm-badge [count]="12" severity="emergency" [pulse]="true"></app-alarm-badge>
         </div>

         <h3 class="mt-4">Alarm Item (N.20)</h3>
         <div class="demo-grid">
             <app-alarm-item [alarm]="alarmActive"></app-alarm-item>
             <app-alarm-item [alarm]="alarmAcknowledged"></app-alarm-item>
             <app-alarm-item [alarm]="alarmSilenced"></app-alarm-item>
         </div>

         <h3 class="mt-4">Alarm List (N.21)</h3>
         <div class="demo-grid">
             <app-alarm-list
                [alarms]="alarmListData"
                (onAcknowledge)="onAlarmAcknowledge($event)"
                (onSilence)="onAlarmSilence($event)">
             </app-alarm-list>

             <app-alarm-list
                [alarms]="alarmListData"
                [grouped]="true"
                [showActions]="false">
             </app-alarm-list>

             <app-alarm-list [alarms]="[]"></app-alarm-list>
         </div>

         <h3 class="mt-4">Alarm Banner (N.22)</h3>
         <div class="demo-grid">
             <app-alarm-banner-pattern
                [alarm]="alarmActive"
                (onAcknowledge)="onAlarmAcknowledge($event)"
                (onDetails)="onAlarmDetails($event)">
             </app-alarm-banner-pattern>

             <app-alarm-banner-pattern
                [alarm]="alarmAcknowledged"
                [showDetails]="true"
                (onDetails)="onAlarmDetails($event)">
             </app-alarm-banner-pattern>
         </div>

         <h3 class="mt-4">MOB Alert (N.23)</h3>
         <div class="demo-grid">
             <app-mob-alert-pattern
                [active]="false"
                (onActivate)="onMobActivate()">
             </app-mob-alert-pattern>

             <app-mob-alert-pattern
                [active]="true"
                [elapsed]="mobElapsedSeconds"
                [position]="mobPosition"
                [bearing]="mobBearing"
                [distance]="mobDistance"
                (onClear)="onMobClear()"
                (onNavigate)="onMobNavigate()">
             </app-mob-alert-pattern>
         </div>

         <h3 class="mt-4">Anchor Watch (N.24)</h3>
         <div class="demo-grid">
             <app-anchor-watch-pattern
                [status]="'set'"
                [radius]="40"
                (onSetAnchor)="onAnchorSet()">
             </app-anchor-watch-pattern>

             <app-anchor-watch-pattern
                [status]="'ok'"
                [radius]="40"
                [anchorPosition]="anchorPosition"
                [currentPosition]="anchorCurrentOk"
                (onRaiseAnchor)="onAnchorRaise()">
             </app-anchor-watch-pattern>

             <app-anchor-watch-pattern
                [status]="'dragging'"
                [radius]="40"
                [anchorPosition]="anchorPosition"
                [currentPosition]="anchorCurrentDragging">
             </app-anchor-watch-pattern>

             <app-anchor-watch-pattern
                [status]="'alarm'"
                [radius]="40"
                [anchorPosition]="anchorPosition"
                [currentPosition]="anchorCurrentAlarm">
             </app-anchor-watch-pattern>
         </div>

         <h3 class="mt-4">Waypoint Card (N.25)</h3>
         <div class="demo-grid">
            <app-waypoint-card-pattern
              [waypoint]="waypointCardActive"
              [active]="true"
              (onEdit)="onWaypointEdit($event)"
              (onDelete)="onWaypointDelete($event)"
              (onNavigate)="onWaypointNavigate($event)">
            </app-waypoint-card-pattern>

            <app-waypoint-card-pattern
              [waypoint]="waypointCardEditing"
              [editing]="true"
              (onEdit)="onWaypointEdit($event)"
              (onDelete)="onWaypointDelete($event)"
              (onNavigate)="onWaypointNavigate($event)">
            </app-waypoint-card-pattern>
         </div>

         <h3 class="mt-4">Waypoint List (N.26)</h3>
         <div class="demo-grid">
            <app-waypoint-list-pattern
              [waypoints]="waypointListData"
              [activeId]="activeWaypointId"
              [reorderable]="true"
              (onSelect)="onWaypointSelect($event)"
              (onEdit)="onWaypointEdit($event)"
              (onDelete)="onWaypointDelete($event)"
              (onNavigate)="onWaypointNavigate($event)"
              (onReorder)="onWaypointReorder($event)">
            </app-waypoint-list-pattern>

            <app-waypoint-list-pattern [waypoints]="[]"></app-waypoint-list-pattern>
         </div>

         <h3 class="mt-4">Waypoint Form (N.27)</h3>
         <div class="demo-grid">
            <app-waypoint-form-pattern
              mode="create"
              (onSave)="onWaypointSave($event)">
            </app-waypoint-form-pattern>

            <app-waypoint-form-pattern
              mode="edit"
              [waypoint]="waypointFormEditData"
              (onSave)="onWaypointSave($event)"
              (onCancel)="onWaypointFormCancel()">
            </app-waypoint-form-pattern>
         </div>

         <h3 class="mt-4">Route Card (N.28)</h3>
         <div class="demo-grid">
            <app-route-card-pattern
              [route]="routeCardActive"
              [active]="true"
              (onSelect)="onRouteSelect($event)"
              (onEdit)="onRouteEdit($event)"
              (onActivate)="onRouteActivate($event)">
            </app-route-card-pattern>

            <app-route-card-pattern
              [route]="routeCardPlanned"
              (onSelect)="onRouteSelect($event)"
              (onEdit)="onRouteEdit($event)"
              (onActivate)="onRouteActivate($event)">
            </app-route-card-pattern>
         </div>

         <h3 class="mt-4">Route List (N.29)</h3>
         <div class="demo-grid">
            <app-route-list-pattern
              [routes]="routeListData"
              [activeId]="activeRouteId"
              (onSelect)="onRouteSelect($event)"
              (onEdit)="onRouteEdit($event)"
              (onActivate)="onRouteActivate($event)">
            </app-route-list-pattern>

            <app-route-list-pattern [routes]="[]"></app-route-list-pattern>
         </div>

         <h3 class="mt-4">Route Editor (N.30)</h3>
         <div class="demo-grid">
            <app-route-editor-pattern
              [routeName]="routeEditorName"
              [waypoints]="routeEditorWaypoints"
              [editing]="false">
            </app-route-editor-pattern>

            <app-route-editor-pattern
              [routeName]="routeEditorName"
              [waypoints]="routeEditorWaypoints"
              [editing]="true"
              (onRename)="onRouteRename($event)"
              (onReorder)="onRouteWaypointReorder($event)"
              (onRemoveWaypoint)="onRouteWaypointRemove($event)"
              (onAddWaypoint)="onRouteWaypointAdd()">
            </app-route-editor-pattern>
         </div>

         <h3 class="mt-4">Track Card (N.31)</h3>
         <div class="demo-grid">
            <app-track-card-pattern
              [track]="trackCardRecent"
              (onView)="onTrackView($event)"
              (onExport)="onTrackExport($event)"
              (onDelete)="onTrackDelete($event)">
            </app-track-card-pattern>

            <app-track-card-pattern
              [track]="trackCardLong"
              (onView)="onTrackView($event)"
              (onExport)="onTrackExport($event)"
              (onDelete)="onTrackDelete($event)">
            </app-track-card-pattern>
         </div>

         <h3 class="mt-4">GPX Import (N.32)</h3>
         <div class="demo-grid">
            <app-gpx-import-pattern
              [allowedTypes]="['.gpx', 'application/gpx+xml']"
              (onImport)="onGpxImport($event)">
            </app-gpx-import-pattern>
         </div>

         <h3 class="mt-4">Autopilot Status (N.33)</h3>
         <div class="demo-grid">
            <app-autopilot-status-pattern
              state="disconnected"
              mode="standby">
            </app-autopilot-status-pattern>

            <app-autopilot-status-pattern
              state="standby"
              mode="standby"
              [target]="autopilotTargetHeading">
            </app-autopilot-status-pattern>

            <app-autopilot-status-pattern
              state="engaged"
              [mode]="autopilotSelectedMode"
              [target]="autopilotTargetHeading">
            </app-autopilot-status-pattern>

            <app-autopilot-status-pattern
              state="error"
              [mode]="autopilotSelectedMode"
              [target]="autopilotTargetHeading">
            </app-autopilot-status-pattern>
         </div>

         <h3 class="mt-4">Autopilot Mode Selector (N.34)</h3>
         <div class="demo-grid">
            <app-autopilot-mode-selector-pattern
              [currentMode]="autopilotSelectedMode"
              [availableModes]="autopilotAvailableModes"
              (onSelect)="onAutopilotModeSelect($event)">
            </app-autopilot-mode-selector-pattern>

            <app-autopilot-mode-selector-pattern
              currentMode="standby"
              [availableModes]="['standby', 'auto', 'wind', 'route']"
              [disabled]="true">
            </app-autopilot-mode-selector-pattern>
         </div>

         <h3 class="mt-4">Heading Control (N.35)</h3>
         <div class="demo-grid">
            <app-heading-control-pattern
              [target]="autopilotTargetHeading"
              [current]="autopilotCurrentHeading"
              (onAdjust)="onAutopilotAdjust($event)">
            </app-heading-control-pattern>

            <app-heading-control-pattern
              [target]="null"
              [current]="autopilotCurrentHeading"
              [disabled]="true">
            </app-heading-control-pattern>
         </div>

         <h3 class="mt-4">Autopilot Console (N.36)</h3>
         <div class="demo-grid">
            <app-autopilot-console-pattern
              [status]="autopilotConsoleDemo"
              (onEngage)="onAutopilotEngage()"
              (onDisengage)="onAutopilotDisengage()"
              (onModeChange)="onAutopilotConsoleModeChange($event)"
              (onAdjust)="onAutopilotConsoleAdjust($event)">
            </app-autopilot-console-pattern>

            <app-autopilot-console-pattern
              [status]="autopilotConsoleDisconnected">
            </app-autopilot-console-pattern>
         </div>

         <h3 class="mt-4">Map Controls (N.37)</h3>
         <div class="demo-grid">
            <app-map-controls-pattern
              [zoom]="mapControlZoom"
              [orientation]="mapControlOrientation"
              [canCenter]="mapCanCenter"
              (onZoom)="onMapControlsZoom($event)"
              (onOrientationToggle)="onMapControlsToggleOrientation()"
              (onCenter)="onMapControlsCenter()">
            </app-map-controls-pattern>

            <app-map-controls-pattern
              [zoom]="9"
              orientation="course-up"
              [canCenter]="false">
            </app-map-controls-pattern>
         </div>

         <h3 class="mt-4">Layer Control (N.38)</h3>
         <div class="demo-grid">
            <app-layer-control-pattern
              [layers]="layerControlItems"
              (onToggle)="onLayerControlToggle($event)">
            </app-layer-control-pattern>

            <app-layer-control-pattern [layers]="[]"></app-layer-control-pattern>
         </div>

         <h3 class="mt-4">Scale Bar (N.39)</h3>
         <div class="demo-grid">
            <app-scale-bar-pattern
              [metersPerPixel]="2.4"
              unit="metric">
            </app-scale-bar-pattern>

            <app-scale-bar-pattern
              [metersPerPixel]="12.5"
              unit="nautical">
            </app-scale-bar-pattern>
         </div>

         <h3 class="mt-4">Chart HUD (N.40)</h3>
         <div class="demo-grid">
            <app-chart-hud-pattern
              [fixState]="chartHudPrimaryState"
              [position]="chartHudPositionFix"
              [navigationData]="chartHudNavFix"
              (onAutopilot)="onChartHudAutopilot()">
            </app-chart-hud-pattern>

            <app-chart-hud-pattern
              fixState="stale"
              [position]="chartHudPositionStale"
              [navigationData]="chartHudNavStale"
              (onAutopilot)="onChartHudAutopilot()">
            </app-chart-hud-pattern>

            <app-chart-hud-pattern
              fixState="no-fix"
              [position]="chartHudPositionNoFix"
              [navigationData]="chartHudNavNoFix">
            </app-chart-hud-pattern>
         </div>

         <h3 class="mt-4">Mini Map (N.41)</h3>
         <div class="demo-grid">
            <app-mini-map-pattern
              [center]="miniMapCenter"
              [zoom]="miniMapZoom"
              [vesselPosition]="miniMapVessel">
            </app-mini-map-pattern>

            <app-mini-map-pattern
              [center]="miniMapCenter"
              [zoom]="8"
              [vesselPosition]="null">
            </app-mini-map-pattern>
         </div>

         <h3 class="mt-4">Playback Controls (N.42)</h3>
         <div class="demo-grid">
            <app-playback-controls-pattern
              [status]="playbackControlsStatus"
              [speed]="playbackControlsSpeed"
              (onPlay)="onPlaybackPlay()"
              (onPause)="onPlaybackPause()"
              (onStop)="onPlaybackStop()"
              (onSpeed)="onPlaybackSpeed($event)">
            </app-playback-controls-pattern>

            <app-playback-controls-pattern
              status="idle"
              [speed]="1"
              [disabled]="true">
            </app-playback-controls-pattern>
         </div>

         <h3 class="mt-4">Timeline (N.43)</h3>
         <div class="demo-grid">
            <app-timeline-pattern
              [start]="timelineStart"
              [end]="timelineEnd"
              [current]="timelineCurrent"
              [events]="timelineEvents"
              (onSeek)="onTimelineSeek($event)">
            </app-timeline-pattern>

            <app-timeline-pattern
              [start]="timelineStart"
              [end]="timelineEnd"
              [current]="timelineCurrent"
              [events]="[]"
              [disabled]="true">
            </app-timeline-pattern>
         </div>

         <h3 class="mt-4">Playback Bar (N.44)</h3>
         <div class="demo-grid">
            <app-playback-bar-pattern
              [state]="playbackBarState"
              (onControl)="onPlaybackBarControl($event)"
              (onSeek)="onPlaybackBarSeek($event)"
              (onSpeedChange)="onPlaybackBarSpeedChange($event)">
            </app-playback-bar-pattern>

            <app-playback-bar-pattern [state]="playbackBarLoadingState"></app-playback-bar-pattern>
         </div>
      </section>

      <section>
         <h2>Widgets (W.1 - W.6)</h2>

         <h3 class="mt-4">Instrument Panel (W.1)</h3>
         <div class="demo-grid">
            <app-instrument-panel-widget
              [instruments]="instrumentPanelItems"
              [layout]="'grid'"
              [editable]="true"
              (onEditToggle)="onInstrumentPanelEditToggle($event)">
            </app-instrument-panel-widget>

            <app-instrument-panel-widget
              [instruments]="instrumentPanelItems.slice(0, 3)"
              [layout]="'list'"
              [editable]="false">
            </app-instrument-panel-widget>
         </div>

         <h3 class="mt-4">Navigation Panel (W.2)</h3>
         <div class="demo-grid">
            <app-navigation-panel-widget
              [position]="navigationPanelPosition"
              [course]="navigationPanelCourse"
              [waypoint]="navigationPanelWaypoint"
              [route]="navigationPanelRoute">
            </app-navigation-panel-widget>
         </div>

         <h3 class="mt-4">Alarm Panel (W.3)</h3>
         <div class="demo-grid">
            <app-alarm-panel-widget
              [alarms]="alarmListData"
              (onAcknowledge)="onAlarmAcknowledge($event)"
              (onSilence)="onAlarmSilence($event)"
              (onConfigure)="onAlarmPanelConfigure()">
            </app-alarm-panel-widget>

            <app-alarm-panel-widget [alarms]="[]"></app-alarm-panel-widget>
         </div>

         <h3 class="mt-4">AIS Panel (W.4)</h3>
         <div class="demo-grid">
            <app-ais-panel-widget
              [targets]="aisTargets"
              [selectedId]="aisWidgetSelectedId"
              (onSelect)="onAisWidgetSelect($event)"
              (onTrack)="onAisWidgetTrack($event)">
            </app-ais-panel-widget>

            <app-ais-panel-widget [targets]="[]"></app-ais-panel-widget>
         </div>

         <h3 class="mt-4">Resources Panel (W.5)</h3>
         <div class="demo-grid">
            <app-resources-panel-widget
              [waypoints]="waypointListData"
              [routes]="routeListData"
              [tracks]="[trackCardRecent, trackCardLong]"
              [activeTab]="resourcesPanelTab"
              [activeWaypointId]="activeWaypointId"
              [activeRouteId]="activeRouteId"
              (onTabChange)="onResourcesPanelTabChange($event)"
              (onWaypointSelect)="onWaypointSelect($event)"
              (onRouteSelect)="onRouteSelect($event)"
              (onTrackSelect)="onTrackView($event)">
            </app-resources-panel-widget>
         </div>

         <h3 class="mt-4">Settings Panel (W.6)</h3>
         <div class="demo-grid">
            <app-settings-panel-widget
              [settings]="settingsPanelItems"
              (onChange)="onSettingsPanelChange($event)">
            </app-settings-panel-widget>
         </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow-y: auto;
    }
    .styleguide-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      color: var(--text-primary);
    }
    section { margin-bottom: 3rem; }
    h2 { border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
    .grid { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .grid.col { flex-direction: column; align-items: stretch; max-width: 400px; }

    .style-section {
      padding: 1.5rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .style-section h2 { margin-top: 0; }
    .section-header { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
    .section-subtitle { margin: 0; color: var(--text-secondary); font-size: var(--text-sm); }
    .demo-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    .demo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; align-items: start; }
    .demo-card {
      padding: 1rem;
      background: var(--bg-surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    .demo-card h3 { margin-top: 0; }
    .demo-stack { display: flex; flex-direction: column; gap: 0.75rem; }
    .context-demo {
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0));
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .compass-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
    .compass-card {
      background: var(--bg-surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
    }
    
    .icon-box { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      gap: 0.5rem; 
      padding: 1rem; 
      background: var(--bg-surface); 
      border-radius: 8px; 
      width: 80px; 
      font-size: 0.7rem; 
      color: var(--text-secondary);
    }

    .color-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }
    .color-swatch-group h3 { margin-bottom: 0.5rem; font-size: 0.9rem; text-transform: uppercase; color: var(--text-tertiary); }
    .swatch { height: 40px; border-radius: 4px; display: flex; align-items: center; padding: 0 1rem; font-size: 0.8rem; margin-bottom: 0.5rem; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }

    .mt-4 { margin-top: 1rem; }
    .spacing-box { background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; }
    
    .shadow-box { 
      background: var(--bg-surface); 
      color: var(--text-primary); 
      width: 80px; 
      height: 80px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      border-radius: 8px;
    }

    .border-box {
       background: var(--bg-surface);
       border: 2px solid var(--primary);
       padding: 1rem;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 0.8rem;
    }

    .anim-box {
      width: 60px;
      height: 60px;
      background: var(--accent);
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
    }

    .responsive-box {
      padding: 1rem;
      background: var(--bg-surface-secondary);
      border: 1px dashed var(--border-strong);
      text-align: center;
    }
    
    /* Simulate media queries for visual feedback */
    @media (min-width: 640px) { .responsive-box::after { content: " (min-width: sm)"; font-weight: bold; color: var(--success); } }
    @media (min-width: 768px) { .responsive-box::after { content: " (min-width: md)"; font-weight: bold; color: var(--warning); } }
    @media (min-width: 1024px) { .responsive-box::after { content: " (min-width: lg)"; font-weight: bold; color: var(--danger); } }

    .z-stack { position: relative; height: 100px; }
    .z-layer { 
      position: absolute; 
      width: 60px; height: 60px; 
      display: flex; align-items: center; justify-content: center;
      color: white; border-radius: 8px;
      box-shadow: var(--shadow-md);
    }
    .z-10 { z-index: 10; background: var(--nord-9); top: 0; left: 0; }
    .z-20 { z-index: 20; background: var(--nord-10); top: 20px; left: 20px; }
    .z-30 { z-index: 30; background: var(--nord-11); top: 40px; left: 40px; }
  `]
})
export class StyleguidePage {
  // Helper for TideDisplay
  getFutureDate(hours: number): Date {
      const d = new Date();
      d.setHours(d.getHours() + hours);
      return d;
  }

  input1 = '';
  simpleContent = 'This is a simple string popover content.';
  checkbox1 = true;
  radioValue = 'opt1';
  selectValue = '';
  selectOptions = [
    { label: 'Speed Log', value: 'sog' },
    { label: 'Wind Anemometer', value: 'wind' },
    { label: 'Depth Sounder', value: 'depth' },
    { label: 'Battery Monitor', value: 'batt' },
  ];
  numberVal = 10;
  colorVal = '#5E81AC';
  toggle1 = false;
  toggle2 = true;
  slider1 = 50;
  slider2 = 5.5;
  aisTargets: AISTargetListItem[] = [
    { id: 't-1', name: 'ST MARY', mmsi: '205551234', distance: 12.4, bearing: 245, cpa: 1.2, tcpa: 1800, status: 'safe' },
    { id: 't-2', name: 'FAST FERRY', mmsi: '338123456', distance: 3.2, bearing: 12, cpa: 0.8, tcpa: 600, status: 'warning' },
    { id: 't-3', name: 'CONTAINER SHIP', mmsi: '512000000', distance: 1.1, bearing: 180, cpa: 0.1, tcpa: 120, status: 'danger' },
    { id: 't-4', name: 'FISHING VESSEL', mmsi: '224778899', distance: 6.8, bearing: 305, cpa: 2.5, tcpa: 2400, status: 'safe' },
  ];
  aisTargetDetails: AISTargetDetailsTarget = {
    name: 'ST MARY',
    mmsi: '205551234',
    callsign: 'FGHJ',
    vesselType: 'Cargo',
    status: 'safe',
    distance: 12.4,
    bearing: 245,
    sog: 9.7,
    cog: 240,
    cpa: 1.2,
    tcpa: 1800,
    lastReport: '2 min ago',
  };
  aisTargetWarning: AISTargetDetailsTarget = {
    name: 'FAST FERRY',
    mmsi: '338123456',
    vesselType: 'Passenger',
    status: 'warning',
    distance: 3.2,
    bearing: 12,
    sog: 18.4,
    cog: 12,
    cpa: 0.8,
    tcpa: 600,
    lastReport: '30 sec ago',
  };

  alarmActive: AlarmItemData = {
    id: 'alarm-1',
    title: 'CPA Warning',
    message: 'CPA below threshold (0.3 nm)',
    severity: 'critical',
    state: 'active',
    timestamp: Date.now() - 45_000,
    source: 'AIS Target: FAST FERRY'
  };

  alarmAcknowledged: AlarmItemData = {
    id: 'alarm-2',
    title: 'Shallow Water',
    message: 'Depth below safety threshold',
    severity: 'warning',
    state: 'acknowledged',
    timestamp: Date.now() - 6 * 60_000,
    source: 'Depth Sensor'
  };

  alarmSilenced: AlarmItemData = {
    id: 'alarm-3',
    title: 'MOB Alert',
    message: 'Man overboard reported',
    severity: 'emergency',
    state: 'silenced',
    timestamp: Date.now() - 14 * 60_000,
    source: 'Manual Trigger'
  };

  alarmListData: AlarmItemData[] = [
    {
      id: 'alarm-1',
      title: 'CPA Warning',
      message: 'CPA below threshold (0.3 nm)',
      severity: 'critical',
      state: 'active',
      timestamp: Date.now() - 45_000,
      source: 'AIS Target: FAST FERRY'
    },
    {
      id: 'alarm-2',
      title: 'Shallow Water',
      message: 'Depth below safety threshold',
      severity: 'warning',
      state: 'acknowledged',
      timestamp: Date.now() - 6 * 60_000,
      source: 'Depth Sensor'
    },
    {
      id: 'alarm-3',
      title: 'MOB Alert',
      message: 'Man overboard reported',
      severity: 'emergency',
      state: 'active',
      timestamp: Date.now() - 14 * 60_000,
      source: 'Manual Trigger'
    }
  ];

  mobPosition = { lat: 42.2406, lon: -8.7207 };
  mobElapsedSeconds = 422;
  mobBearing = 214;
  mobDistance = 0.34;

  anchorPosition = { lat: 42.2406, lon: -8.7207 };
  anchorCurrentOk = { lat: 42.2408, lon: -8.7205 };
  anchorCurrentDragging = { lat: 42.2412, lon: -8.7201 };
  anchorCurrentAlarm = { lat: 42.2423, lon: -8.7190 };

  waypointCardActive: WaypointCardData = {
    id: 'wp-1',
    name: 'Cies Inbound',
    lat: 42.2406,
    lon: -8.7207,
    description: 'Primary approach waypoint',
    icon: 'waypoint',
    timestamp: Date.now() - 10 * 60_000
  };

  waypointCardEditing: WaypointCardData = {
    id: 'wp-2',
    name: 'Ria Marker',
    lat: 42.2588,
    lon: -8.7399,
    description: 'Edit state sample',
    icon: 'target',
    timestamp: Date.now() - 24 * 60_000
  };

  waypointListData: WaypointCardData[] = [
    this.waypointCardActive,
    this.waypointCardEditing,
    {
      id: 'wp-3',
      name: 'Outer Safe Water',
      lat: 42.2712,
      lon: -8.7814,
      description: 'Offshore checkpoint',
      icon: 'anchor',
      timestamp: Date.now() - 55 * 60_000
    }
  ];
  activeWaypointId = 'wp-1';

  waypointFormEditData: WaypointFormData = {
    id: 'wp-2',
    name: 'Ria Marker',
    lat: 42.2588,
    lon: -8.7399,
    description: 'Edit existing waypoint'
  };

  routeCardActive: RouteCardData = {
    id: 'route-1',
    name: 'Vigo to Cies',
    waypointCount: 6,
    totalDistanceNm: 13.4,
    progress: 68,
    eta: '18:45 UTC'
  };

  routeCardPlanned: RouteCardData = {
    id: 'route-2',
    name: 'Cies to Bayona',
    waypointCount: 4,
    totalDistanceNm: 10.2,
    progress: 0,
    eta: '20:10 UTC'
  };

  routeListData: RouteCardData[] = [this.routeCardActive, this.routeCardPlanned];
  activeRouteId = 'route-1';

  routeEditorName = 'Vigo to Cies';
  routeEditorWaypoints: RouteEditorWaypoint[] = [
    { id: 'rw-1', name: 'Vigo Exit', bearingToNextDeg: 248, distanceToNextNm: 2.1 },
    { id: 'rw-2', name: 'Mid Channel', bearingToNextDeg: 251, distanceToNextNm: 5.3 },
    { id: 'rw-3', name: 'Cies Inbound', bearingToNextDeg: 262, distanceToNextNm: 6.0 }
  ];

  trackCardRecent: TrackCardData = {
    id: 'tr-1',
    name: 'Morning Run',
    pointCount: 842,
    distanceNm: 18.6,
    startTime: '2026-02-18 07:10',
    endTime: '2026-02-18 10:42'
  };

  trackCardLong: TrackCardData = {
    id: 'tr-2',
    name: 'Delivery Leg',
    pointCount: 4520,
    distanceNm: 95.4,
    startTime: '2026-02-17 03:20',
    endTime: '2026-02-18 00:30'
  };

  autopilotSelectedMode: AutopilotModeSelectorMode = 'auto';
  autopilotAvailableModes: AutopilotModeSelectorMode[] = ['auto', 'wind', 'route'];
  autopilotTargetHeading = 242;
  autopilotCurrentHeading = 238;

  autopilotConsoleDemo: AutopilotConsoleStatus = {
    state: 'standby',
    mode: 'auto',
    target: 242,
    current: 238,
    availableModes: ['auto', 'wind', 'route'],
    error: null
  };

  autopilotConsoleDisconnected: AutopilotConsoleStatus = {
    state: 'disconnected',
    mode: 'standby',
    target: null,
    current: null,
    availableModes: ['standby', 'auto', 'wind', 'route'],
    error: 'No heartbeat from autopilot controller'
  };

  mapControlZoom = 12;
  mapControlOrientation: MapControlOrientation = 'north-up';
  mapCanCenter = true;

  layerControlItems: LayerControlItem[] = [
    { id: 'depth', label: 'Depth Contours', enabled: true },
    { id: 'ais', label: 'AIS Targets', enabled: true },
    { id: 'route', label: 'Active Route', enabled: false },
    { id: 'satellite', label: 'Satellite Overlay', enabled: false, locked: true }
  ];

  chartHudPrimaryState: ChartHudFixState = 'fix';
  chartHudPositionFix: ChartHudPosition = { lat: 42.2406, lon: -8.7207, ageSeconds: 1 };
  chartHudPositionStale: ChartHudPosition = { lat: 42.2405, lon: -8.7206, ageSeconds: 18 };
  chartHudPositionNoFix: ChartHudPosition = { lat: null, lon: null, ageSeconds: null };

  chartHudNavFix: ChartHudNavigationData = {
    sog: 7.4,
    cog: 242,
    heading: 238,
    depth: 15.8
  };

  chartHudNavStale: ChartHudNavigationData = {
    sog: 7.1,
    cog: 241,
    heading: 237,
    depth: 16.0
  };

  chartHudNavNoFix: ChartHudNavigationData = {
    sog: null,
    cog: null,
    heading: null,
    depth: 14.7
  };

  miniMapCenter: MiniMapPoint = { lat: 42.2406, lon: -8.7207 };
  miniMapVessel: MiniMapPoint = { lat: 42.2410, lon: -8.7198 };
  miniMapZoom = 12;

  playbackControlsStatus: PlaybackControlsStatus = 'idle';
  playbackControlsSpeed = 2;

  timelineStart = Date.now() - 15 * 60_000;
  timelineEnd = Date.now();
  timelineCurrent = this.timelineStart + 5 * 60_000;
  timelineEvents: TimelineEventItem[] = [
    { time: this.timelineStart + 2 * 60_000, type: 'note', label: 'Playback segment loaded' },
    { time: this.timelineStart + 6 * 60_000, type: 'waypoint', label: 'Waypoint WP-03 reached' },
    { time: this.timelineStart + 11 * 60_000, type: 'alarm', label: 'CPA warning acknowledged' }
  ];

  playbackBarState: PlaybackBarPatternState = {
    status: 'ready',
    start: this.timelineStart,
    end: this.timelineEnd,
    current: this.timelineCurrent,
    speed: this.playbackControlsSpeed,
    events: this.timelineEvents
  };

  playbackBarLoadingState: PlaybackBarPatternState = {
    status: 'loading',
    start: this.timelineStart,
    end: this.timelineEnd,
    current: this.timelineStart,
    speed: 1,
    events: []
  };

  instrumentPanelItems: InstrumentPanelItem[] = [
    { id: 'inst-sog', label: 'SOG', value: '7.4', unit: 'kn', icon: 'speedometer', status: 'success' },
    { id: 'inst-depth', label: 'Depth', value: '15.8', unit: 'm', icon: 'depth', status: 'neutral' },
    { id: 'inst-aws', label: 'AWS', value: '14.2', unit: 'kn', icon: 'wind', status: 'warning' },
    { id: 'inst-batt', label: 'Battery', value: '92', unit: '%', icon: 'battery', status: 'success' },
    { id: 'inst-cog', label: 'COG', value: '242', unit: 'deg', icon: 'compass', status: 'neutral' }
  ];

  navigationPanelPosition: NavigationPanelPosition = { lat: 42.2406, lon: -8.7207 };
  navigationPanelCourse: NavigationPanelCourse = { cog: 242, sog: 7.4, heading: 238 };
  navigationPanelWaypoint: NavigationPanelWaypoint = {
    name: 'Cies Inbound',
    distanceNm: 3.2,
    bearingDeg: 262,
    eta: '18:45 UTC'
  };
  navigationPanelRoute: NavigationPanelRoute = { name: 'Vigo to Cies', progress: 68, eta: '19:10 UTC' };

  aisWidgetSelectedId: string | null = this.aisTargets[0]?.id ?? null;
  resourcesPanelTab: ResourcesPanelTab = 'waypoints';
  settingsPanelItems: SettingsPanelItem[] = [
    {
      id: 'night-mode',
      label: 'Night Mode',
      description: 'Enable reduced glare colors for bridge use.',
      type: 'toggle',
      value: false
    },
    {
      id: 'speed-unit',
      label: 'Speed Unit',
      description: 'Default speed unit for all instruments.',
      type: 'select',
      value: 'kn',
      options: [
        { label: 'Knots', value: 'kn' },
        { label: 'km/h', value: 'kmh' },
        { label: 'm/s', value: 'ms' }
      ]
    },
    {
      id: 'cpa-threshold',
      label: 'CPA Threshold',
      description: 'Minimum CPA before warning is raised.',
      type: 'number',
      value: 0.5,
      min: 0.1,
      max: 3,
      step: 0.1
    },
    {
      id: 'anchor-radius',
      label: 'Anchor Radius',
      description: 'Safe radius in meters for anchor watch.',
      type: 'number',
      value: 40,
      min: 10,
      max: 200,
      step: 1
    }
  ];

  // Tabs Demo Data
  activeTab1 = 'general';
  activeTab2 = 'engine';
  activeTab3 = 'general';
  activeTab4 = 'nav';

  demoTabs = [
    { id: 'general', label: 'General' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'network', label: 'Network', disabled: true },
    { id: 'security', label: 'Security' }
  ];

  demoTabsWithIcons: { id: string; label: string; icon: IconName; count?: number }[] = [
    { id: 'nav', label: 'Navigation', icon: 'compass' },
    { id: 'engine', label: 'Engine', icon: 'speedometer', count: 2 },
    { id: 'wind', label: 'Wind', icon: 'wind-arrow' }
  ];

  // Breadcrumb Demo
  demoBreadcrumb: BreadcrumbItem[] = [
    { label: 'Home', url: '/styleguide', icon: 'home' },
    { label: 'Settings', url: '/styleguide' },
    { label: 'Network', url: '/styleguide' },
    { label: 'Wi-Fi Configuration' } // Current page
  ];

  // Pagination Demo
  currentPage1 = 1;
  currentPage2 = 6;
  pageSize = 10;
  // Coordinate Demo
  editLat = 42.2406;
  editLon = -8.7207;

  onCoordinateChange(coord: {lat: number, lon: number}) {
    this.editLat = coord.lat;
    this.editLon = coord.lon;
    // console.log('Valid coordinate:', coord);
  }

  onMapSelectLog() {
    console.log('Open map picker...');
  }

  // 
  onPageChange(page: number) {
    console.log('Page changed:', page);
  }

  onCardClick() {
    console.log('Card clicked!');
  }

  onAction() {
    console.log('Empty state action clicked');
  }

  onAlarmAcknowledge(alarm: AlarmItemData) {
    console.log('Acknowledge alarm:', alarm.id);
  }

  onAlarmSilence(alarm: AlarmItemData) {
    console.log('Silence alarm:', alarm.id);
  }

  onAlarmDetails(alarm: AlarmItemData) {
    console.log('Alarm details:', alarm.id);
  }

  onMobActivate() {
    console.log('MOB activated');
  }

  onMobClear() {
    console.log('MOB cleared');
  }

  onMobNavigate() {
    console.log('Navigate to MOB');
  }

  onAnchorSet() {
    console.log('Anchor set');
  }

  onAnchorRaise() {
    console.log('Anchor raised');
  }

  onWaypointSelect(id: string) {
    this.activeWaypointId = id;
    console.log('Waypoint selected:', id);
  }

  onWaypointEdit(id: string) {
    console.log('Waypoint edit:', id);
  }

  onWaypointDelete(id: string) {
    console.log('Waypoint delete:', id);
  }

  onWaypointNavigate(id: string) {
    console.log('Waypoint navigate:', id);
  }

  onWaypointReorder(event: WaypointReorderEvent) {
    console.log('Waypoint reorder:', event.id, event.direction);
  }

  onWaypointSave(data: WaypointFormData) {
    console.log('Waypoint save:', data);
  }

  onWaypointFormCancel() {
    console.log('Waypoint form cancel');
  }

  onRouteSelect(id: string) {
    this.activeRouteId = id;
    console.log('Route selected:', id);
  }

  onRouteEdit(id: string) {
    console.log('Route edit:', id);
  }

  onRouteActivate(id: string) {
    this.activeRouteId = id;
    console.log('Route activate:', id);
  }

  onRouteRename(name: string) {
    this.routeEditorName = name;
    console.log('Route rename:', name);
  }

  onRouteWaypointReorder(event: RouteEditorReorderEvent) {
    console.log('Route waypoint reorder:', event.id, event.direction);
  }

  onRouteWaypointRemove(id: string) {
    console.log('Route waypoint remove:', id);
  }

  onRouteWaypointAdd() {
    console.log('Route waypoint add');
  }

  onTrackView(id: string) {
    console.log('Track view:', id);
  }

  onTrackExport(id: string) {
    console.log('Track export:', id);
  }

  onTrackDelete(id: string) {
    console.log('Track delete:', id);
  }

  onGpxImport(preview: GpxImportPreview) {
    console.log('GPX import:', preview);
  }

  onAutopilotModeSelect(mode: AutopilotModeSelectorMode) {
    this.autopilotSelectedMode = mode;
    this.autopilotConsoleDemo = {
      ...this.autopilotConsoleDemo,
      mode
    };
    console.log('Autopilot mode selected:', mode);
  }

  onAutopilotAdjust(delta: number) {
    this.autopilotTargetHeading = this.normalizeHeading(this.autopilotTargetHeading + delta);
    this.autopilotConsoleDemo = {
      ...this.autopilotConsoleDemo,
      target: this.autopilotTargetHeading
    };
    console.log('Autopilot heading adjust:', delta, '->', this.autopilotTargetHeading);
  }

  onAutopilotEngage() {
    this.autopilotConsoleDemo = {
      ...this.autopilotConsoleDemo,
      state: 'engaged'
    };
    console.log('Autopilot engaged');
  }

  onAutopilotDisengage() {
    this.autopilotConsoleDemo = {
      ...this.autopilotConsoleDemo,
      state: 'standby'
    };
    console.log('Autopilot standby');
  }

  onAutopilotConsoleModeChange(mode: AutopilotModeSelectorMode) {
    this.onAutopilotModeSelect(mode);
  }

  onAutopilotConsoleAdjust(delta: number) {
    this.onAutopilotAdjust(delta);
  }

  onMapControlsZoom(delta: number) {
    this.mapControlZoom = this.clamp(this.mapControlZoom + delta, 1, 22);
    this.miniMapZoom = this.mapControlZoom;
    console.log('Map zoom:', this.mapControlZoom);
  }

  onMapControlsToggleOrientation() {
    this.mapControlOrientation = this.mapControlOrientation === 'north-up' ? 'course-up' : 'north-up';
    console.log('Map orientation:', this.mapControlOrientation);
  }

  onMapControlsCenter() {
    if (this.miniMapVessel) {
      this.miniMapCenter = { ...this.miniMapVessel };
    }
    console.log('Map centered on vessel');
  }

  onLayerControlToggle(id: string) {
    this.layerControlItems = this.layerControlItems.map((layer) => {
      if (layer.id !== id || layer.locked) {
        return layer;
      }
      return {
        ...layer,
        enabled: !layer.enabled
      };
    });
    console.log('Layer toggle:', id);
  }

  onChartHudAutopilot() {
    this.onAutopilotEngage();
    console.log('Chart HUD autopilot shortcut');
  }

  onPlaybackPlay() {
    this.playbackControlsStatus = 'playing';
    this.playbackBarState = {
      ...this.playbackBarState,
      status: 'playing'
    };
    console.log('Playback play');
  }

  onPlaybackPause() {
    this.playbackControlsStatus = 'paused';
    this.playbackBarState = {
      ...this.playbackBarState,
      status: 'paused'
    };
    console.log('Playback pause');
  }

  onPlaybackStop() {
    this.playbackControlsStatus = 'idle';
    this.timelineCurrent = this.timelineStart;
    this.playbackBarState = {
      ...this.playbackBarState,
      status: 'ready',
      current: this.timelineStart
    };
    console.log('Playback stop');
  }

  onPlaybackSpeed(speed: number) {
    this.playbackControlsSpeed = speed;
    this.playbackBarState = {
      ...this.playbackBarState,
      speed
    };
    console.log('Playback speed:', speed);
  }

  onTimelineSeek(timestamp: number) {
    const clamped = this.clamp(timestamp, this.timelineStart, this.timelineEnd);
    this.timelineCurrent = clamped;
    this.playbackBarState = {
      ...this.playbackBarState,
      current: clamped
    };
    console.log('Timeline seek:', clamped);
  }

  onPlaybackBarControl(control: PlaybackBarPatternControl) {
    if (control === 'play') {
      this.playbackControlsStatus = 'playing';
      this.playbackBarState = { ...this.playbackBarState, status: 'playing' };
    } else if (control === 'pause') {
      this.playbackControlsStatus = 'paused';
      this.playbackBarState = { ...this.playbackBarState, status: 'paused' };
    } else {
      this.playbackControlsStatus = 'idle';
      this.timelineCurrent = this.timelineStart;
      this.playbackBarState = {
        ...this.playbackBarState,
        status: 'ready',
        current: this.timelineStart
      };
    }
    console.log('Playback bar control:', control);
  }

  onPlaybackBarSeek(timestamp: number) {
    this.onTimelineSeek(timestamp);
  }

  onPlaybackBarSpeedChange(speed: number) {
    this.onPlaybackSpeed(speed);
  }

  onInstrumentPanelEditToggle(editMode: boolean) {
    console.log('Instrument panel edit mode:', editMode);
  }

  onAlarmPanelConfigure() {
    console.log('Alarm panel configure');
  }

  onAisWidgetSelect(id: string) {
    this.aisWidgetSelectedId = id;
    console.log('AIS widget selected:', id);
  }

  onAisWidgetTrack(id: string) {
    this.aisWidgetSelectedId = id;
    console.log('AIS widget track:', id);
  }

  onResourcesPanelTabChange(tab: ResourcesPanelTab) {
    this.resourcesPanelTab = tab;
    console.log('Resources tab changed:', tab);
  }

  onSettingsPanelChange(change: SettingsPanelChange) {
    this.settingsPanelItems = this.settingsPanelItems.map((item) => {
      if (item.id !== change.id) {
        return item;
      }
      return { ...item, value: change.value };
    });
    console.log('Settings changed:', change.id, change.value);
  }

  // Search Demo
  loadingSearch = false;
  
  onSearch(query: string) {
    console.log('Searching for:', query);
    this.loadingSearch = true;
    setTimeout(() => this.loadingSearch = false, 2000);
  }

  // Nav Demo
  navItems: NavItemDef[] = [
    { label: 'Dashboard', icon: 'menu', active: true }, // Using generic icons as 'dashboard' might not be in IconName yet
    { label: 'Charts', icon: 'compass' },
    { label: 'AIS', icon: 'vessel', badge: '12' },
  ];

  // Date/Time Demo
  dateValue = '2024-05-20';
  timeValue = '14:30';
  dateRangeValue = { start: '2024-06-01', end: '2024-06-15' };
  angleValue = 45;

  onAngleChange(val: number) {
    this.angleValue = val;
  }

  // Dialog & Overlay Demo
  dialogOpen = false;
  sheetOpen = false;

  dropdownItems: MenuItem[] = [
    { label: 'Edit', icon: 'settings', action: () => console.log('Edit clicked') },
    { label: 'Duplicate', icon: 'layers', action: () => console.log('Duplicate clicked') },
    { divider: true },
    { label: 'Delete', icon: 'close', danger: true, action: () => console.log('Delete clicked') }
  ];

  contextMenuItems = this.dropdownItems;
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuVisible = true;
  }
  
  dialogActions: DialogAction[] = [
    { label: 'Cancel', variant: 'ghost', handler: () => this.dialogOpen = false },
    { label: 'Confirm', variant: 'primary', handler: () => { console.log('Confirmed'); this.dialogOpen = false; } }
  ];

  openDialog() {
    this.dialogOpen = true;
  }

  openBottomSheet() {
    this.sheetOpen = true;
  }

  private normalizeHeading(value: number): number {
    return ((Math.round(value) % 360) + 360) % 360;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

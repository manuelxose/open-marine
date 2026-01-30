import { Component, inject, signal } from '@angular/core';
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
  ],
  template: `
    <div class="styleguide-container">
      <h1>Primitives Styleguide</h1>

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
            <h3>Contained Variant</h3>
            <app-tabs 
              [items]="demoTabs" 
              variant="contained"
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
}

import { IDeferred } from 'angular';
import { IModalServiceInstance } from 'angular-ui-bootstrap';
import { Formik } from 'formik';
import { $q } from 'ngimport';
import React from 'react';
import { Observable, Subject } from 'rxjs';

import { AccountService, Application, IAccount, ILoadBalancerModalProps, NgReact, noop, ReactModal, SpinFormik, StageConfigField, StageConstants, WizardModal, WizardPage } from '@spinnaker/core';
import { ICloudFoundryLoadBalancerUpsertCommand } from 'cloudfoundry/domain/ICloudFoundryLoadBalancer';
import { AccountRegionClusterSelector, Routes } from 'cloudfoundry/presentation';

interface ICloudFoundryLoadBalancersValues {
  routes: string[];
}

export interface ICreateCloudFoundryMapLoadBalancerState {
  accounts: IAccount[];
  regions: string[];
  application: Application;
  initialValues: ICloudFoundryLoadBalancersValues;
}

export class CloudFoundryMapLoadBalancerModal extends React.Component<
  ILoadBalancerModalProps,
  ICreateCloudFoundryMapLoadBalancerState
> {
  private destroy$ = new Subject();
  private formikRef = React.createRef<Formik<ICloudFoundryLoadBalancersValues>>();
  private refreshUnsubscribe: () => void;
  private $uibModalInstanceEmulation: IModalServiceInstance & { deferred?: IDeferred<any> };

  constructor(props: ILoadBalancerModalProps) {
    super(props);

    const deferred = $q.defer();
    const promise = deferred.promise;
    this.$uibModalInstanceEmulation = {
      result: promise,
      close: () => this.props.dismissModal(),
      dismiss: () => this.props.dismissModal(),
    } as IModalServiceInstance;
    Object.assign(this.$uibModalInstanceEmulation, { deferred });
    this.state = {
      accounts: [],
      regions: [],
      application: props.app,
      initialValues: {
        routes: [''],
      },
    };
    Observable.fromPromise(AccountService.listAccounts('cloudfoundry'))
      .takeUntil(this.destroy$)
      .subscribe((rawAccounts: IAccount[]) => this.setState({ accounts: rawAccounts }));
  }

  public static show(props: ILoadBalancerModalProps): Promise<void> {
    const modalProps = { dialogClassName: 'wizard-modal modal-lg' };
    return ReactModal.show(
      CloudFoundryMapLoadBalancerModal,
      {
        ...props,
        className: 'create-pipeline-modal-overflow-visible',
      },
      modalProps,
    );
  }

  public componentDidMount(): void {
    Observable.fromPromise(AccountService.listAccounts('cloudfoundry'))
      .takeUntil(this.destroy$)
      .subscribe((accounts) => this.setState({ accounts }));
  }

  public componentWillUnmount(): void {
    if (this.refreshUnsubscribe) {
      this.refreshUnsubscribe();
    }
    this.destroy$.next();
  }

  protected onApplicationRefresh(): void {
    this.refreshUnsubscribe = undefined;
    this.props.dismissModal();
  }

  private submit = (): void => {
    this.props.dismissModal();
  };

  public render() {
    const initialValues = {} as ICloudFoundryLoadBalancerUpsertCommand;
    const target = '';
    const { accounts, application } = this.state;
    const { TargetSelect } = NgReact;

    return (
      <WizardModal<ICloudFoundryLoadBalancerUpsertCommand>
        heading="Create a load balancer"
        initialValues={initialValues}
        taskMonitor={noop}
        dismissModal={this.props.dismissModal}
        closeModal={this.submit}
        submitButtonLabel={'Ok'}
        render={({ formik, nextIdx, wizard }) => (
          <WizardPage
            label="Map load balancer"
            wizard={wizard}
            order={nextIdx()}
            render={({ innerRef }) => (
              <div className="form-horizontal">
                <AccountRegionClusterSelector
                  accounts={accounts}
                  application={application}
                  cloudProvider={'cloudfoundry'}
                  isSingleRegion={true}
                  onComponentUpdate={(values) => {
                    // update region cluster
                  }}
                  component={this}
                />
                <StageConfigField label="Target">
                  <TargetSelect
                    model={{ target }}
                    options={StageConstants.TARGET_LIST}
                    onChange={() => {
                      // update target
                    }}
                  />
                </StageConfigField>
                <SpinFormik<ICloudFoundryLoadBalancersValues>
                  ref={this.formikRef}
                  initialValues={initialValues}
                  onSubmit={null}
                  render={() => {
                    return (
                      <Routes
                        fieldName={'routes'}
                        isRequired={true}
                        singleRouteOnly={true}
                        // onChange={(routes: string[]) => {
                        //   // update routes
                        // }}
                      />
                    );
                  }}
                />
              </div>
            )}
          />
        )}
      />
    );
  }
}

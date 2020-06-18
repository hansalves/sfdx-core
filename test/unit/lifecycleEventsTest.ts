/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { stubMethod } from '@salesforce/ts-sinon';
import * as chai from 'chai';
import { Lifecycle } from '../../src/LifecycleEvents';
import { testSetup } from '../../src/testSetup';

const $$ = testSetup();

describe('lifecycleEvents', () => {
  let fake;
  let fakeSpy;
  let loggerSpy;

  class Foo {
    public bar(name: string, result: string) {
      return result[name];
    }
  }

  beforeEach(() => {
    loggerSpy = stubMethod($$.SANDBOX, Lifecycle.getInstance(), 'debug');
    fake = new Foo();
    fakeSpy = stubMethod($$.SANDBOX, fake, 'bar');
  });

  it('getInstance is a functioning singleton pattern', async () => {
    chai.assert(Lifecycle.getInstance() === Lifecycle.getInstance());
  });

  it('succsssful event registration and emitting causes runHook to be called', async () => {
    Lifecycle.getInstance().on('test1', async result => {
      fake.bar('test1', result);
    });
    Lifecycle.getInstance().on('test2', async result => {
      fake.bar('test1', result);
    });
    chai.expect(fakeSpy.callCount).to.be.equal(0);

    await Lifecycle.getInstance().emit('test1', 'Success');
    chai.expect(fakeSpy.callCount).to.be.equal(1);
    chai.expect(fakeSpy.args[0][1]).to.be.equal('Success');

    await Lifecycle.getInstance().emit('test2', 'Also Success');
    chai.expect(fakeSpy.callCount).to.be.equal(2);
    chai.expect(fakeSpy.args[1][1]).to.be.equal('Also Success');
  });

  it('an event registering twice logs a warning but creates two listeners', async () => {
    Lifecycle.getInstance().on('test3', async result => {
      fake.bar('test3', result);
    });
    Lifecycle.getInstance().on('test3', async result => {
      fake.bar('test3', result);
    });
    chai.expect(loggerSpy.callCount).to.be.equal(1);
    chai
      .expect(loggerSpy.args[0][0])
      .to.be.equal(
        '2 lifecycle events with the name test3 have now been registered. When this event is emitted all 2 listeners will fire.'
      );

    await Lifecycle.getInstance().emit('test3', 'Two Listeners');
    chai.expect(fakeSpy.callCount).to.be.equal(2);
  });

  it('emitting an event that is not registered logs a warning and will not call runHook', async () => {
    await Lifecycle.getInstance().emit('test4', 'Expect failure');
    chai.expect(fakeSpy.callCount).to.be.equal(0);
    chai.expect(loggerSpy.callCount).to.be.equal(1);
    chai
      .expect(loggerSpy.args[0][0])
      .to.be.equal(
        'A lifecycle event with the name test4 does not exist. An event must be registered before it can be emitted.'
      );
  });

  it('removeAllListeners works', async () => {
    Lifecycle.getInstance().on('test5', async result => {
      fake.bar('test5', result);
    });
    await Lifecycle.getInstance().emit('test5', 'Success');
    chai.expect(fakeSpy.callCount).to.be.equal(1);
    chai.expect(fakeSpy.args[0][1]).to.be.equal('Success');

    Lifecycle.getInstance().removeAllListeners('test5');
    await Lifecycle.getInstance().emit('test5', 'Failure: Listener Removed');
    chai.expect(fakeSpy.callCount).to.be.equal(1);
    chai.expect(loggerSpy.callCount).to.be.equal(1);
    chai
      .expect(loggerSpy.args[0][0])
      .to.be.equal(
        'A lifecycle event with the name test5 does not exist. An event must be registered before it can be emitted.'
      );
  });

  it('getListeners works', async () => {
    const x = async result => {
      fake.bar('test6', result);
    };
    Lifecycle.getInstance().on('test6', x);
    chai.expect(Lifecycle.getInstance().getListeners('test6')[0]).to.be.equal(x);

    chai.expect(Lifecycle.getInstance().getListeners('undefinedKey').length).to.be.equal(0);
  });
});

/*
 PureMVC - Copyright(c) 2006-12 Futurescale, Inc., Some rights reserved.
 Your reuse is governed by the Creative Commons Attribution 3.0 United States License
*/
module puremvc
{
	"use strict";

	/**
	 * A Singleton <code>IView</code> implementation.
	 * 
	 * <P>
	 * In PureMVC, the <code>View</code> class assumes these responsibilities:
	 * <UL>
	 * <LI>Maintain a cache of <code>IMediator</code> instances.</LI>
	 * <LI>Provide methods for registering, retrieving, and removing <code>IMediators</code>.</LI>
	 * <LI>Notifiying <code>IMediators</code> when they are registered or removed.</LI>
	 * <LI>Managing the observer lists for each <code>INotification</code> in the application.</LI>
	 * <LI>Providing a method for attaching <code>IObservers</code> to an <code>INotification</code>'s observer list.</LI>
	 * <LI>Providing a method for broadcasting an <code>INotification</code>.</LI>
	 * <LI>Notifying the <code>IObservers</code> of a given <code>INotification</code> when it broadcast.</LI>
	 * </UL>
	 * 
	 * @see org.puremvc.typescript.patterns.mediator.Mediator Mediator
	 * @see org.puremvc.typescript.patterns.observer.Observer Observer
	 * @see org.puremvc.typescript.patterns.observer.Notification Notification
	 */
	export class View
		implements IView
	{
		/**
		 * Constructor. 
		 * 
		 * <P>
		 * This <code>IView</code> implementation is a Singleton, 
		 * so you should not call the constructor 
		 * directly, but instead call the static Singleton 
		 * Factory method <code>View.getInstance()</code>
		 * 
		 * @throws Error Error if Singleton instance has already been constructed
		 * 
		 */
		constructor()
		{
			if( View.instance != null )
				throw Error( View.SINGLETON_MSG );

			View.instance = this;
			this.mediatorMap = new IMediator[]();
			this.observerMap = new IObserver[][]();
			this.initializeView();
		}
		
		/**
		 * Initialize the Singleton View instance.
		 * 
		 * <P>
		 * Called automatically by the constructor, this
		 * is your opportunity to initialize the Singleton
		 * instance in your subclass without overriding the
		 * constructor.</P>
		 * 
		 * @return void
		 */
		public initializeView():void
		{
		}
	
		/**
		 * View Singleton Factory method.
		 * 
		 * @return the Singleton instance of <code>View</code>
		 */
		public static getInstance():IView
		{
			if ( View.instance == null )
				View.instance = new View();

			return View.instance;
		}
				
		/**
		 * Register an <code>IObserver</code> to be notified
		 * of <code>INotifications</code> with a given name.
		 * 
		 * @param notificationName the name of the <code>INotifications</code> to notify this <code>IObserver</code> of
		 * @param observer the <code>IObserver</code> to register
		 */
		public registerObserver( notificationName:string, observer:IObserver ):void
		{
			var observers:IObserver[] = this.observerMap[ notificationName ];
			if( observers )
				observers.push( observer );
			else
				this.observerMap[ notificationName ] = [ observer ];
		}

		/**
		 * Notify the <code>IObservers</code> for a particular <code>INotification</code>.
		 * 
		 * <P>
		 * All previously attached <code>IObservers</code> for this <code>INotification</code>'s
		 * list are notified and are passed a reference to the <code>INotification</code> in 
		 * the order in which they were registered.</P>
		 * 
		 * @param notification the <code>INotification</code> to notify <code>IObservers</code> of.
		 */
		public notifyObservers( notification:INotification ):void
		{
			if( this.observerMap[ notification.getName() ] != null )
			{
				// Get a reference to the observers list for this notification name
				var observers_ref:IObserver[] = this.observerMap[ notification.getName() ];

				//FIXME Find a way to optimize the copy of the array
				// Copy observers from reference array to working array, 
				// since the reference array may change during the notification loop
   				var observers:IObserver[] = new IObserver[]();
   				var observer:IObserver;
				for( var i:number=0; i<observers_ref.length; i++ )
				{
					observer = observers_ref[ i ];
					observers.push( observer );
				}
				
				// Notify Observers from the working array				
				for( i=0; i<observers.length; i++ )
				{
					observer = observers[ i ];
					observer.notifyObserver( notification );
				}
			}
		}

		/**
		 * Remove the observer for a given notifyContext from an observer list for a given Notification name.
		 * <P>
		 * @param notificationName which observer list to remove from 
		 * @param notifyContext remove the observer with this object as its notifyContext
		 */
		public removeObserver( notificationName:string, notifyContext:Object ):void
		{
			// the observer list for the notification under inspection
			var observers:IObserver[] = this.observerMap[ notificationName ];

			// find the observer for the notifyContext
			for( var i:number=0; i<observers.length; i++ )
			{
				if( observers[i].compareNotifyContext( notifyContext ) === true )
				{
					// there can only be one Observer for a given notifyContext 
					// in any given Observer list, so remove it and break
					observers.splice(i,1);
					break;
				}
			}

			// Also, when a Notification's Observer list length falls to 
			// zero, delete the notification key from the observer map
			if ( observers.length == 0 )
				delete this.observerMap[ notificationName ];
		} 

		/**
		 * Register an <code>IMediator</code> instance with the <code>View</code>.
		 * 
		 * <P>
		 * Registers the <code>IMediator</code> so that it can be retrieved by name,
		 * and further interrogates the <code>IMediator</code> for its 
		 * <code>INotification</code> interests.</P>
		 * <P>
		 * If the <code>IMediator</code> returns any <code>INotification</code> 
		 * names to be notified about, an <code>Observer</code> is created encapsulating 
		 * the <code>IMediator</code> instance's <code>handleNotification</code> method 
		 * and registering it as an <code>Observer</code> for all <code>INotifications</code> the 
		 * <code>IMediator</code> is interested in.</p>
		 * 
		 * @param mediatorName the name to associate with this <code>IMediator</code> instance
		 * @param mediator a reference to the <code>IMediator</code> instance
		 */
		public registerMediator( mediator:IMediator ):void
		{
			// do not allow re-registration (you must to removeMediator fist)
			if( this.mediatorMap[ mediator.getMediatorName() ] != null )
				return;

			// Register the Mediator for retrieval by name
			this.mediatorMap[ mediator.getMediatorName() ] = mediator;
			
			// Get Notification interests, if any.
			var interests:Array = mediator.listNotificationInterests();

			// Register Mediator as an observer for each of its notification interests
			if ( interests.length > 0 ) 
			{
				// Create Observer referencing this mediator's handlNotification method
				var observer:IObserver = new Observer( mediator.handleNotification, mediator );

				// Register Mediator as Observer for its list of Notification interests
				for ( var i:number=0;  i<interests.length; i++ )
					this.registerObserver( interests[i],  observer );
			}
			
			// alert the mediator that it has been registered
			mediator.onRegister();
			
		}

		/**
		 * Retrieve an <code>IMediator</code> from the <code>View</code>.
		 * 
		 * @param mediatorName the name of the <code>IMediator</code> instance to retrieve.
		 * @return the <code>IMediator</code> instance previously registered with the given <code>mediatorName</code>.
		 */
		public retrieveMediator( mediatorName:string ):IMediator
		{
			return this.mediatorMap[ mediatorName ];
		}

		/**
		 * Remove an <code>IMediator</code> from the <code>View</code>.
		 * 
		 * @param mediatorName name of the <code>IMediator</code> instance to be removed.
		 * @return the <code>IMediator</code> that was removed from the <code>View</code>
		 */
		public removeMediator( mediatorName:string ):IMediator
		{
			// Retrieve the named mediator
			var mediator:IMediator = this.mediatorMap[ mediatorName ];
			
			if( mediator )
			{
				// for every notification this mediator is interested in...
				var interests:Array = mediator.listNotificationInterests();
				for( var i:number=0; i<interests.length; i++ )
				{
					// remove the observer linking the mediator 
					// to the notification interest
					this.removeObserver( interests[i], mediator );
				}	
				
				// remove the mediator from the map		
				delete this.mediatorMap[ mediatorName ];
	
				// alert the mediator that it has been removed
				mediator.onRemove();
			}
			
			return mediator;
		}
		
		/**
		 * Check if a Mediator is registered or not
		 * 
		 * @param mediatorName
		 * @return whether a Mediator is registered with the given <code>mediatorName</code>.
		 */
		public hasMediator( mediatorName:string ):Boolean
		{
			return this.mediatorMap[ mediatorName ] != null;
		}

		// Mapping of Mediator names to Mediator instances
		public mediatorMap:IMediator[];

		// Mapping of Notification names to Observer lists
		public observerMap:IObserver[][];
		
		// Singleton instance
		public static instance:IView;

		// Message Constants
		public static SINGLETON_MSG:string = "View Singleton already constructed!";
	}
}
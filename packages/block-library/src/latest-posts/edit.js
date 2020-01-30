/**
 * External dependencies
 */
import { isUndefined, pickBy } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Component, RawHTML } from '@wordpress/element';
import {
	PanelBody,
	Placeholder,
	QueryControls,
	RadioControl,
	RangeControl,
	Spinner,
	ToggleControl,
	ToolbarGroup,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { __ } from '@wordpress/i18n';
import { dateI18n, format, __experimentalGetSettings } from '@wordpress/date';
import {
	InspectorControls,
	BlockControls,
} from '@wordpress/block-editor';
import { withSelect } from '@wordpress/data';
import { compose, withState } from '@wordpress/compose';
import { ENTER, SPACE } from '@wordpress/keycodes';

/**
 * Module Constants
 */
const CATEGORIES_LIST_QUERY = {
	per_page: -1,
};
const MAX_POSTS_COLUMNS = 6;

class LatestPostsEdit extends Component {
	constructor() {
		super( ...arguments );
		this.state = {
			categoriesList: [],
		};
	}

	componentDidMount() {
		this.isStillMounted = true;
		this.fetchRequest = apiFetch( {
			path: addQueryArgs( `/wp/v2/categories`, CATEGORIES_LIST_QUERY ),
		} ).then(
			( categoriesList ) => {
				if ( this.isStillMounted ) {
					this.setState( { categoriesList } );
				}
			}
		).catch(
			() => {
				if ( this.isStillMounted ) {
					this.setState( { categoriesList: [] } );
				}
			}
		);
	}

	componentWillUnmount() {
		this.isStillMounted = false;
	}

	render() {
		const { attributes, setAttributes, latestPosts, page, setState, hasMorePages } = this.props;
		const { categoriesList } = this.state;
		const {
			displayPostContentRadio,
			displayPostContent,
			displayPostDate,
			postLayout,
			columns,
			order,
			orderBy,
			paginate,
			categories,
			postsToShow,
			excerptLength,
		} = attributes;

		const inspectorControls = (
			<InspectorControls>
				<PanelBody title={ __( 'Post content settings' ) }>
					<ToggleControl
						label={ __( 'Post Content' ) }
						checked={ displayPostContent }
						onChange={ ( value ) => setAttributes( { displayPostContent: value } ) }
					/>
					{ displayPostContent &&
					<RadioControl
						label={ __( 'Show:' ) }
						selected={ displayPostContentRadio }
						options={ [
							{ label: __( 'Excerpt' ), value: 'excerpt' },
							{ label: __( 'Full Post' ), value: 'full_post' },
						] }
						onChange={ ( value ) => setAttributes( { displayPostContentRadio: value } ) }
					/>
					}
					{ displayPostContent && displayPostContentRadio === 'excerpt' &&
						<RangeControl
							label={ __( 'Max number of words in excerpt' ) }
							value={ excerptLength }
							onChange={ ( value ) => setAttributes( { excerptLength: value } ) }
							min={ 10 }
							max={ 100 }
						/>
					}
				</PanelBody>

				<PanelBody title={ __( 'Post meta settings' ) }>
					<ToggleControl
						label={ __( 'Display post date' ) }
						checked={ displayPostDate }
						onChange={ ( value ) => setAttributes( { displayPostDate: value } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Sorting and filtering' ) }>
					<QueryControls
						{ ...{ order, orderBy } }
						numberOfItems={ postsToShow }
						categoriesList={ categoriesList }
						selectedCategoryId={ categories }
						onOrderChange={ ( value ) => setAttributes( { order: value } ) }
						onOrderByChange={ ( value ) => setAttributes( { orderBy: value } ) }
						onCategoryChange={ ( value ) => setAttributes( { categories: '' !== value ? value : undefined } ) }
						onNumberOfItemsChange={ ( value ) => setAttributes( { postsToShow: value } ) }
					/>
					{ postLayout === 'grid' &&
						<RangeControl
							label={ __( 'Columns' ) }
							value={ columns }
							onChange={ ( value ) => setAttributes( { columns: value } ) }
							min={ 2 }
							max={ ! hasPosts ? MAX_POSTS_COLUMNS : Math.min( MAX_POSTS_COLUMNS, latestPosts.length ) }
							required
						/>
					}
					<ToggleControl
						label={ __( 'Enable Pagination' ) }
						checked={ paginate }
						onChange={ ( value ) => {
							if ( ! value ) {
								setState( { page: 1 } );
							}
							setAttributes( { paginate: value } )
						} }
					/>
				</PanelBody>
			</InspectorControls>
		);

		const hasPosts = Array.isArray( latestPosts ) && latestPosts.length;
		if ( ! hasPosts ) {
			return (
				<>
					{ inspectorControls }
					<Placeholder
						icon="admin-post"
						label={ __( 'Latest Posts' ) }
					>
						{ ! Array.isArray( latestPosts ) ?
							<Spinner /> :
							__( 'No posts found.' )
						}
					</Placeholder>
				</>
			);
		}

		// Removing posts from display should be instant.
		const displayPosts = latestPosts.length > postsToShow ?
			latestPosts.slice( 0, postsToShow ) :
			latestPosts;

		const layoutControls = [
			{
				icon: 'list-view',
				title: __( 'List view' ),
				onClick: () => setAttributes( { postLayout: 'list' } ),
				isActive: postLayout === 'list',
			},
			{
				icon: 'grid-view',
				title: __( 'Grid view' ),
				onClick: () => setAttributes( { postLayout: 'grid' } ),
				isActive: postLayout === 'grid',
			},
		];

		const dateFormat = __experimentalGetSettings().formats.date;

		return (
			<>
				{ inspectorControls }
				<BlockControls>
					<ToolbarGroup controls={ layoutControls } />
				</BlockControls>
				<ul
					className={ classnames( this.props.className, {
						'wp-block-latest-posts__list': true,
						'is-grid': postLayout === 'grid',
						'has-dates': displayPostDate,
						[ `columns-${ columns }` ]: postLayout === 'grid',
					} ) }
				>
					{ displayPosts.map( ( post, i ) => {
						const titleTrimmed = post.title.rendered.trim();
						let excerpt = post.excerpt.rendered;
						if ( post.excerpt.raw === '' ) {
							excerpt = post.content.raw;
						}
						const excerptElement = document.createElement( 'div' );
						excerptElement.innerHTML = excerpt;
						excerpt = excerptElement.textContent || excerptElement.innerText || '';
						return (
							<li key={ i }>
								<a href={ post.link } target="_blank" rel="noreferrer noopener">
									{ titleTrimmed ? (
										<RawHTML>
											{ titleTrimmed }
										</RawHTML>
									) :
										__( '(no title)' )
									}
								</a>
								{ displayPostDate && post.date_gmt &&
									<time dateTime={ format( 'c', post.date_gmt ) } className="wp-block-latest-posts__post-date">
										{ dateI18n( dateFormat, post.date_gmt ) }
									</time>
								}
								{ displayPostContent && displayPostContentRadio === 'excerpt' &&
								<div className="wp-block-latest-posts__post-excerpt">
									<RawHTML
										key="html"
									>
										{ excerptLength < excerpt.trim().split( ' ' ).length ?
											excerpt.trim().split( ' ', excerptLength ).join( ' ' ) + ' ... <a href=' + post.link + 'target="_blank" rel="noopener noreferrer">' + __( 'Read more' ) + '</a>' :
											excerpt.trim().split( ' ', excerptLength ).join( ' ' ) }
									</RawHTML>
								</div>
								}
								{ displayPostContent && displayPostContentRadio === 'full_post' &&
								<div className="wp-block-latest-posts__post-full-content">
									<RawHTML
										key="html"
									>
										{ post.content.raw.trim() }
									</RawHTML>
								</div>
								}
							</li>
						);
					} ) }
					{ paginate && (
						<>
							{ page > 1 && (
								<span
									className="wp-block-latest-posts__navigation-link"
									role="button"
									tabIndex="0"
									onKeyDown={ ( event ) => {
										if ( ENTER === event.keyCode || SPACE === event.keyCode ) {
											event.preventDefault();
											setState( { page: page - 1 } );
										}
									} }
									onClick={ () => setState( { page: page - 1 } ) }
								>
									{ __( 'Previous' ) }
								</span>
							) }
							{ hasMorePages && (
								<span
									className="wp-block-latest-posts__navigation-link"
									role="button"
									tabIndex="0"
									onKeyDown={ ( event ) => {
										if ( ENTER === event.keyCode || SPACE === event.keyCode ) {
											event.preventDefault();
											setState( { page: page + 1 } );
										}
									} }
									onClick={ () => setState( { page: page + 1 } ) }
								>
									{ __( 'Next' ) }
								</span>
							) }
						</>
					) }
				</ul>
			</>
		);
	}
}

export default compose( [
	withState( {
		page: 1,
	} ),
	withSelect( ( select, props ) => {
		const { postsToShow, order, orderBy, categories } = props.attributes;
		const { getEntityRecords } = select( 'core' );
		const latestPostsQuery = pickBy(
			{
				categories,
				order,
				orderby: orderBy,
				per_page: postsToShow + 1,
				offset: ( props.page - 1 ) * postsToShow,
			},
			( value ) => ! isUndefined( value )
		);
		let hasMorePages = false;
		let latestPosts = getEntityRecords( 'postType', 'post', latestPostsQuery );
		if ( latestPosts && latestPosts.length === postsToShow + 1 ) {
			hasMorePages = true;
			latestPosts = latestPosts.slice( 0, latestPosts.length - 1 );
		}
		return {
			latestPosts,
			hasMorePages,
		};
	} ),
] )( LatestPostsEdit );
